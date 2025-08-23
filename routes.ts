import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateContractPDF } from "./contract-generator";
import * as fs from "fs/promises";
import * as path from "path";
import { insertClientSchema, insertFormSchema, insertContractSchema, insertSharedFormSchema, updateUserProfileSchema, updatePasswordSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import Stripe from "stripe";

const scryptAsync = promisify(scrypt);

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Serve static contract files
  app.use('/contracts', express.static(path.join(process.cwd(), 'contracts')));



  // Protected routes (require authentication)
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Middleware to check if user has pro subscription
  const requirePro = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = req.user;
    if (user.subscriptionType !== "pro" || user.subscriptionStatus !== "active") {
      return res.status(403).json({ 
        message: "Pro subscription required",
        needsUpgrade: true 
      });
    }
    next();
  };

  // User profile routes
  app.put("/api/user/profile", requireAuth, async (req: any, res) => {
    try {
      const validatedData = updateUserProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUser(req.user.id, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===== STRIPE BILLING ROUTES =====

  // Create Stripe Checkout Session for Pro subscription
  app.post("/api/create-checkout-session", requireAuth, async (req: any, res) => {
    try {
      const { priceType } = req.body; // 'monthly' or 'yearly'
      const user = req.user;
      
      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id }
        });
        customerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId: customerId });
      }

      // Define price IDs (these would be created in Stripe Dashboard)
      const priceId = priceType === 'yearly' 
        ? process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly_placeholder'
        : process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly_placeholder';

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard?upgraded=true`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard?upgrade=cancelled`,
        metadata: {
          userId: user.id,
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get billing information for dashboard
  app.get("/api/billing", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.stripeCustomerId || !user.stripeSubscriptionId) {
        return res.json({
          hasSubscription: false,
          subscriptionType: 'free',
          subscriptionStatus: 'inactive'
        });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const upcoming = await stripe.invoices.upcoming({
        customer: user.stripeCustomerId,
      }).catch(() => null);

      res.json({
        hasSubscription: true,
        subscriptionType: user.subscriptionType,
        subscriptionStatus: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        nextBillDate: upcoming?.next_payment_attempt,
        nextBillAmount: upcoming?.amount_due,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } catch (error: any) {
      console.error('Error fetching billing info:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Cancel subscription
  app.post("/api/cancel-subscription", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({ message: "Subscription will be cancelled at the end of the current period" });
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Reactivate subscription
  app.post("/api/reactivate-subscription", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No subscription found" });
      }

      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      res.json({ message: "Subscription reactivated" });
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe webhook endpoint
  app.post("/api/webhook/stripe", express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          
          if (userId && session.subscription) {
            await storage.updateUser(userId, {
              subscriptionType: "pro",
              subscriptionStatus: "active",
              stripeSubscriptionId: session.subscription as string,
            });
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
            
            if (customer.metadata?.userId) {
              await storage.updateUser(customer.metadata.userId, {
                subscriptionStatus: "active",
                subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
              });
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
          
          if (customer.metadata?.userId) {
            await storage.updateUser(customer.metadata.userId, {
              subscriptionType: "free",
              subscriptionStatus: "inactive",
              stripeSubscriptionId: null,
              subscriptionEndsAt: null,
            });
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
            
            if (customer.metadata?.userId) {
              await storage.updateUser(customer.metadata.userId, {
                subscriptionStatus: "past_due",
              });
            }
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/user/password", requireAuth, async (req: any, res) => {
    try {
      const validatedData = updatePasswordSchema.parse(req.body);
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await comparePasswords(validatedData.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedNewPassword = await hashPassword(validatedData.newPassword);
      
      // Update password
      const updatedUser = await storage.updateUser(req.user.id, { password: hashedNewPassword });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/user/account", requireAuth, async (req: any, res) => {
    try {
      const deleted = await storage.deleteUser(req.user.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log out the user
      req.logout((err: any) => {
        if (err) {
          console.error("Error logging out:", err);
        }
      });
      
      res.json({ message: "Account deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user zapLink
  app.get("/api/user/zaplink", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        zapLink: user.zapLink,
        fullUrl: `clientzap.com/zap/${user.zapLink}`
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Billing API endpoints
  app.get("/api/billing", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const hasSubscription = user.stripeSubscriptionId !== null;
      let billing = {
        hasSubscription,
        subscriptionType: user.subscriptionType,
        subscriptionStatus: user.subscriptionStatus,
      };

      if (hasSubscription) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const upcoming = await stripe.invoices.upcoming({
          customer: user.stripeCustomerId,
        }).catch(() => null);

        res.json({
          ...billing,
          currentPeriodEnd: subscription.current_period_end,
          nextBillDate: upcoming?.next_payment_attempt,
          nextBillAmount: upcoming?.amount_due,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
      } else {
        res.json(billing);
      }
    } catch (error: any) {
      console.error("Error fetching billing info:", error);
      res.status(500).json({ error: "Failed to fetch billing information" });
    }
  });

  app.get("/api/subscription/usage", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const forms = await storage.getFormsByUserId(userId);
      const clients = await storage.getClientsByUserId(userId);
      const formSubmissions = await storage.getFormSubmissions(userId);
      
      res.json({
        formsCount: forms.length,
        zapsCount: formSubmissions.length,
        clientsCount: clients.length,
      });
    } catch (error: any) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  app.post("/api/create-checkout-session", requireAuth, async (req: any, res) => {
    try {
      const { priceType } = req.body;
      const user = req.user;

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await storage.updateStripeCustomerId(user.id, customerId);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'ClientZap Pro',
                description: 'Unlimited forms, zaps, and custom branding',
              },
              unit_amount: priceType === 'yearly' ? 9000 : 900,
              recurring: {
                interval: priceType === 'yearly' ? 'year' : 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/billing?success=true`,
        cancel_url: `${req.headers.origin}/billing?canceled=true`,
        metadata: {
          userId: user.id,
          priceType,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/cancel-subscription", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  app.post("/api/reactivate-subscription", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error reactivating subscription:", error);
      res.status(500).json({ error: "Failed to reactivate subscription" });
    }
  });

  // Client management routes
  app.get("/api/clients", requireAuth, async (req: any, res) => {
    try {
      const clients = await storage.getClientsByUserId(req.user.id);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/clients", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertClientSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/clients/:id", requireAuth, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const updatedClient = await storage.updateClient(req.params.id, req.body);
      res.json(updatedClient);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Form management routes
  app.get("/api/forms", requireAuth, async (req: any, res) => {
    try {
      const forms = await storage.getFormsByUserId(req.user.id);
      res.json(forms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/forms", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertFormSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const form = await storage.createForm(validatedData);
      res.status(201).json(form);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/forms/:id", requireAuth, async (req: any, res) => {
    try {
      const form = await storage.getForm(req.params.id);
      if (!form || form.userId !== req.user.id) {
        return res.status(404).json({ message: "Form not found" });
      }

      const updatedForm = await storage.updateForm(req.params.id, req.body);
      res.json(updatedForm);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/forms/:id", requireAuth, async (req: any, res) => {
    try {
      const form = await storage.getForm(req.params.id);
      if (!form || form.userId !== req.user.id) {
        return res.status(404).json({ message: "Form not found" });
      }

      const deleted = await storage.deleteForm(req.params.id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete form" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public form submission endpoint
  app.get("/api/public/forms/:shareableLink", async (req, res) => {
    try {
      const form = await storage.getFormByShareableLink(req.params.shareableLink);
      if (!form || !form.isPublished) {
        return res.status(404).json({ message: "Form not found" });
      }
      res.json(form);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Submit public form (no authentication required)
  app.post("/api/public/forms/:shareableLink/submit", async (req, res) => {
    try {
      const form = await storage.getFormByShareableLink(req.params.shareableLink);
      if (!form || !form.isPublished) {
        return res.status(404).json({ message: "Form not found" });
      }

      // Extract client name and email from submission data
      const submissionData = req.body;
      const clientName = submissionData.name || submissionData.fullName || submissionData.clientName || "Unknown";
      const clientEmail = submissionData.email || submissionData.clientEmail || "";

      if (!clientEmail) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Create form submission
      const submission = await storage.createFormSubmission({
        formId: form.id,
        clientName,
        clientEmail,
        submissionData,
        calendlyLink: form.calendlyLink || undefined
      });

      res.status(201).json({
        message: "Form submitted successfully",
        submissionId: submission.id,
        calendlyLink: submission.calendlyLink,
        showCalendlyButton: !!submission.calendlyLink
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Send form to zapLink
  app.post("/api/forms/:formId/send", requireAuth, async (req: any, res) => {
    try {
      const formId = req.params.formId;
      const { zapLink } = req.body;

      if (!zapLink) {
        return res.status(400).json({ message: "ZapLink is required" });
      }

      // Extract zapLink ID from full URL or use as is
      let zapLinkId = zapLink;
      if (zapLink.includes('clientzap.com/zap/')) {
        zapLinkId = zapLink.split('clientzap.com/zap/')[1];
      }
      if (zapLinkId.startsWith('/')) {
        zapLinkId = zapLinkId.substring(1);
      }

      // Verify the form exists and belongs to the sender
      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      if (form.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to send this form" });
      }

      // Find the recipient by zapLink
      const recipient = await storage.getUserByZapLink(zapLinkId);
      if (!recipient) {
        return res.status(404).json({ message: "❌ Zap Link not found" });
      }

      // Prevent sending to yourself
      if (recipient.id === req.user.id) {
        return res.status(400).json({ message: "You cannot send a form to yourself" });
      }

      // Create the shared form record
      const sharedForm = await storage.shareFormToUser({
        formId: form.id,
        senderId: req.user.id,
        recipientId: recipient.id,
      });

      res.json({ 
        message: "✅ Form sent successfully!",
        sharedFormId: sharedForm.id,
        recipientName: recipient.displayName || recipient.username
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get shared forms (Zap Inbox)
  app.get("/api/zap-inbox", requireAuth, async (req: any, res) => {
    try {
      const sharedForms = await storage.getSharedFormsForUser(req.user.id);
      res.json(sharedForms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a shared form from user's Zap Inbox
  app.delete("/api/zap-inbox/:sharedFormId", requireAuth, async (req: any, res) => {
    try {
      const { sharedFormId } = req.params;
      await storage.deleteSharedForm(sharedFormId, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get form submissions for authenticated user
  app.get("/api/submissions", requireAuth, async (req: any, res) => {
    try {
      const submissions = await storage.getFormSubmissions(req.user.id);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate contract from form submission
  app.post("/api/submissions/:id/contract", requireAuth, async (req: any, res) => {
    try {
      const submission = await storage.getFormSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Verify the submission belongs to a form owned by this user
      const form = await storage.getForm(submission.formId);
      if (!form || form.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Generate the actual PDF contract
      const contractPDF = await generateContractPDF(submission, form.title);
      
      // Save the PDF file
      const contractDir = path.join(process.cwd(), 'contracts');
      await fs.mkdir(contractDir, { recursive: true });
      
      const contractFilename = `contract-${submission.id}.pdf`;
      const contractPath = path.join(contractDir, contractFilename);
      await fs.writeFile(contractPath, contractPDF);
      
      const contractUrl = `/contracts/${contractFilename}`;
      
      const updatedSubmission = await storage.updateFormSubmission(submission.id, {
        contractGenerated: true,
        contractUrl: contractUrl
      });

      res.json({
        message: "Contract generated successfully",
        contractUrl: contractUrl,
        submission: updatedSubmission
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/public/forms/:shareableLink/submit", async (req, res) => {
    try {
      const form = await storage.getFormByShareableLink(req.params.shareableLink);
      if (!form || !form.isPublished) {
        return res.status(404).json({ message: "Form not found" });
      }

      // Extract client info from form data
      const submissionData = req.body;
      const clientName = submissionData.name || submissionData.clientname || submissionData.fullname || "Unknown Client";
      const clientEmail = submissionData.email || submissionData.emailaddress || "";

      if (!clientEmail) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Create form submission record
      const submission = await storage.createFormSubmission({
        formId: form.id,
        clientName,
        clientEmail,
        submissionData,
        calendlyLink: form.calendlyLink || null,
      });

      // Create client record for compatibility
      const client = await storage.createClient({
        name: clientName,
        email: clientEmail,
        userId: form.userId,
        formStatus: "completed",
        contractStatus: "not_sent",
        callStatus: "not_scheduled",
        progress: 33,
        formData: submissionData,
      });

      res.status(201).json({ 
        success: true, 
        submission,
        client,
        calendlyLink: form.calendlyLink,
        formTitle: form.title 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Form submissions management
  app.get("/api/submissions", requireAuth, async (req: any, res) => {
    try {
      const submissions = await storage.getFormSubmissions(req.user.id);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/submissions/:id", requireAuth, async (req: any, res) => {
    try {
      const submission = await storage.getFormSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Verify ownership through form
      const form = await storage.getForm(submission.formId);
      if (!form || form.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(submission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate contract PDF
  app.post("/api/submissions/:id/generate-contract", requireAuth, async (req: any, res) => {
    try {
      const submission = await storage.getFormSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Verify ownership
      const form = await storage.getForm(submission.formId);
      if (!form || form.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Generate the actual PDF contract
      const contractPDF = await generateContractPDF(submission, form.title);
      
      // Save the PDF file
      const contractDir = path.join(process.cwd(), 'contracts');
      await fs.mkdir(contractDir, { recursive: true });
      
      const contractFilename = `contract-${submission.id}.pdf`;
      const contractPath = path.join(contractDir, contractFilename);
      await fs.writeFile(contractPath, contractPDF);
      
      const contractUrl = `/contracts/${contractFilename}`;
      
      const updatedSubmission = await storage.updateFormSubmission(submission.id, {
        contractGenerated: true,
        contractUrl: contractUrl
      });

      res.json({ contractUrl, submission: updatedSubmission });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Contract routes
  app.get("/api/contracts/client/:clientId", requireAuth, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.clientId);
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const contracts = await storage.getContractsByClientId(req.params.clientId);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contracts", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertContractSchema.parse(req.body);
      
      // Verify the client belongs to the authenticated user
      const client = await storage.getClient(validatedData.clientId);
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const contract = await storage.createContract(validatedData);
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req: any, res) => {
    try {
      const clients = await storage.getClientsByUserId(req.user.id);
      
      const stats = {
        activeClients: clients.length,
        pendingForms: clients.filter(c => c.formStatus === "pending").length,
        signedContracts: clients.filter(c => c.contractStatus === "signed").length,
        scheduledCalls: clients.filter(c => c.callStatus === "scheduled").length,
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Integration endpoints for DocuSign and Calendly
  app.post("/api/integrations/docusign/send-contract", requireAuth, async (req: any, res) => {
    try {
      const { clientId, contractData } = req.body;
      
      const client = await storage.getClient(clientId);
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      // TODO: Integrate with DocuSign API
      // For now, create a contract record
      const contract = await storage.createContract({
        clientId,
        status: "sent",
        contractData,
      });

      // Update client contract status
      await storage.updateClient(clientId, { 
        contractStatus: "sent",
        progress: Math.max(client.progress, 66) // Contract sent = 66% progress
      });

      res.json({ message: "Contract sent successfully", contractId: contract.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/integrations/calendly/schedule", requireAuth, async (req: any, res) => {
    try {
      const { clientId } = req.body;
      
      const client = await storage.getClient(clientId);
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      // TODO: Integrate with Calendly API
      // Update client call status
      await storage.updateClient(clientId, { 
        callStatus: "scheduled",
        progress: 100 // All steps completed
      });

      res.json({ message: "Call scheduled successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
