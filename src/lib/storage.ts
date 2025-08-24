import { type User, type InsertUser, type Client, type InsertClient, type Form, type InsertForm, type Contract, type InsertContract, type WaitlistSignup, type InsertWaitlist, type FormSubmission, type InsertFormSubmission, type SharedForm, type InsertSharedForm } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import Database from "@replit/database";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByZapLink(zapLink: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, data: { customerId: string; subscriptionId: string }): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Client methods
  getClientsByUserId(userId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Form methods
  getFormsByUserId(userId: string): Promise<Form[]>;
  getForm(id: string): Promise<Form | undefined>;
  getFormByShareableLink(link: string): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: string, updates: Partial<Form>): Promise<Form | undefined>;
  deleteForm(id: string): Promise<boolean>;

  // Contract methods
  getContractsByClientId(clientId: string): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, updates: Partial<Contract>): Promise<Contract | undefined>;

  // Waitlist methods
  createWaitlistSignup(signup: InsertWaitlist): Promise<WaitlistSignup>;
  getWaitlistSignups(): Promise<WaitlistSignup[]>;

  // Form submission methods
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;

  // Shared form methods
  shareFormToUser(sharedForm: InsertSharedForm): Promise<SharedForm>;
  getSharedFormsForUser(recipientId: string): Promise<(SharedForm & { form: Form; sender: User })[]>;
  getSharedForm(id: string): Promise<SharedForm | undefined>;
  deleteSharedForm(id: string, userId: string): Promise<boolean>;
  getFormSubmissions(userId: string): Promise<FormSubmission[]>;
  getFormSubmissionById(id: string): Promise<FormSubmission | undefined>;
  updateFormSubmission(id: string, updates: Partial<FormSubmission>): Promise<FormSubmission>;

  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<string, Client>;
  private forms: Map<string, Form>;
  private contracts: Map<string, Contract>;
  private waitlistSignups: Map<string, WaitlistSignup>;
  private formSubmissions: Map<string, FormSubmission>;
  private sharedForms: Map<string, SharedForm>;
  private db: Database;
  public sessionStore: any;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.forms = new Map();
    this.contracts = new Map();
    this.waitlistSignups = new Map();
    this.formSubmissions = new Map();
    this.sharedForms = new Map();
    this.db = new Database();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Load existing users from Replit DB on startup
    this.loadUsersFromDB();
  }

  private async loadUsersFromDB() {
    try {
      const dbResult = await this.db.get("users");
      const existingUsers: any[] = Array.isArray(dbResult) ? dbResult : [];
      
      for (const userData of existingUsers) {
        const user: User = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          password: userData.password,
          createdAt: new Date(userData.createdAt),
          zapLink: userData.zapLink,
          displayName: userData.displayName || null,
          profilePicture: userData.profilePicture || null,
          freelancerType: userData.freelancerType || null,
          businessName: userData.businessName || null,
          businessLogo: userData.businessLogo || null,
          website: userData.website || null,
          socialLinks: userData.socialLinks || null,
          brandColor: userData.brandColor || "#3b82f6",
          emailSignature: userData.emailSignature || null,
          subscriptionType: userData.subscriptionType || "free",
          subscriptionStatus: userData.subscriptionStatus || "inactive",
          stripeCustomerId: userData.stripeCustomerId || null,
          stripeSubscriptionId: userData.stripeSubscriptionId || null,
          subscriptionEndsAt: userData.subscriptionEndsAt ? new Date(userData.subscriptionEndsAt) : null,
        };
        this.users.set(user.id, user);
      }
      
      console.log(`Loaded ${existingUsers.length} users from database`);
    } catch (error) {
      console.error("Error loading users from Replit DB:", error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByZapLink(zapLink: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.zapLink === zapLink,
    );
  }

  // Generate unique zapLink
  private generateZapLink(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async generateUniqueZapLink(): Promise<string> {
    let zapLink = this.generateZapLink();
    let attempts = 0;
    const maxAttempts = 100;
    
    while (await this.getUserByZapLink(zapLink) && attempts < maxAttempts) {
      zapLink = this.generateZapLink();
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique zapLink after maximum attempts');
    }
    
    return zapLink;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const zapLink = await this.generateUniqueZapLink();
    
    const user: User = { 
      ...insertUser, 
      id,
      zapLink,
      createdAt: new Date(),
      displayName: null,
      profilePicture: null,
      freelancerType: null,
      businessName: null,
      businessLogo: null,
      website: null,
      socialLinks: null,
      brandColor: "#3b82f6",
      emailSignature: null,
      subscriptionType: "free",
      subscriptionStatus: "inactive",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
    };
    
    // Store in memory
    this.users.set(id, user);
    
    // Also persist to Replit DB for permanent storage
    try {
      const existingUsers = await this.db.get("users") || [];
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password, // Already hashed
        zapLink: user.zapLink,
        createdAt: user.createdAt.toISOString(),
        displayName: user.displayName,
        profilePicture: user.profilePicture,
        freelancerType: user.freelancerType,
        businessName: user.businessName,
        businessLogo: user.businessLogo,
        website: user.website,
        socialLinks: user.socialLinks,
        brandColor: user.brandColor,
        emailSignature: user.emailSignature,
        subscriptionType: user.subscriptionType,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
      };
      
      const updatedUsers = Array.isArray(existingUsers) ? [...existingUsers, userData] : [userData];
      await this.db.set("users", updatedUsers);
    } catch (error) {
      console.error("Error storing user in Replit DB:", error);
    }
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    
    // Also update in Replit DB
    try {
      const existingUsers = await this.db.get("users") || [];
      const updatedUsers = Array.isArray(existingUsers) 
        ? existingUsers.map((u: any) => u.id === id ? {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            password: updatedUser.password,
            zapLink: updatedUser.zapLink,
            createdAt: updatedUser.createdAt.toISOString(),
            // Include profile fields
            displayName: updatedUser.displayName,
            profilePicture: updatedUser.profilePicture,
            freelancerType: updatedUser.freelancerType,
            businessName: updatedUser.businessName,
            businessLogo: updatedUser.businessLogo,
            website: updatedUser.website,
            socialLinks: updatedUser.socialLinks,
            brandColor: updatedUser.brandColor,
            emailSignature: updatedUser.emailSignature,
            subscriptionType: updatedUser.subscriptionType,
            subscriptionStatus: updatedUser.subscriptionStatus,
            stripeCustomerId: updatedUser.stripeCustomerId,
            stripeSubscriptionId: updatedUser.stripeSubscriptionId,
            subscriptionEndsAt: updatedUser.subscriptionEndsAt ? updatedUser.subscriptionEndsAt.toISOString() : null,
          } : u)
        : [];
      await this.db.set("users", updatedUsers);
    } catch (error) {
      console.error("Error updating user in Replit DB:", error);
    }
    
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const deleted = this.users.delete(id);
    
    // Also delete from Replit DB
    if (deleted) {
      try {
        const existingUsers = await this.db.get("users") || [];
        const updatedUsers = Array.isArray(existingUsers) 
          ? existingUsers.filter((u: any) => u.id !== id)
          : [];
        await this.db.set("users", updatedUsers);
      } catch (error) {
        console.error("Error deleting user from Replit DB:", error);
      }
    }
    
    return deleted;
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined> {
    return this.updateUser(userId, { stripeCustomerId });
  }

  async updateUserStripeInfo(userId: string, data: { customerId: string; subscriptionId: string }): Promise<User | undefined> {
    return this.updateUser(userId, { 
      stripeCustomerId: data.customerId,
      stripeSubscriptionId: data.subscriptionId,
    });
  }

  // Client methods
  async getClientsByUserId(userId: string): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = { 
      ...insertClient, 
      id,
      createdAt: new Date(),
      progress: insertClient.progress || 0,
      formStatus: insertClient.formStatus || "pending",
      contractStatus: insertClient.contractStatus || "not_sent",
      callStatus: insertClient.callStatus || "not_scheduled",
      formData: insertClient.formData || null
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient = { ...client, ...updates };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Form methods
  async getFormsByUserId(userId: string): Promise<Form[]> {
    return Array.from(this.forms.values()).filter(
      (form) => form.userId === userId,
    );
  }

  async getForm(id: string): Promise<Form | undefined> {
    return this.forms.get(id);
  }

  async getFormByShareableLink(link: string): Promise<Form | undefined> {
    return Array.from(this.forms.values()).find(
      (form) => form.shareableLink === link,
    );
  }

  async createForm(insertForm: InsertForm): Promise<Form> {
    const id = randomUUID();
    const shareableLink = randomUUID();
    const form: Form = { 
      ...insertForm, 
      id,
      shareableLink,
      createdAt: new Date(),
      calendlyLink: insertForm.calendlyLink || null,
      description: insertForm.description || null,
      isPublished: insertForm.isPublished || false
    };
    this.forms.set(id, form);
    return form;
  }

  async updateForm(id: string, updates: Partial<Form>): Promise<Form | undefined> {
    const form = this.forms.get(id);
    if (!form) return undefined;
    
    const updatedForm = { ...form, ...updates };
    this.forms.set(id, updatedForm);
    return updatedForm;
  }

  async deleteForm(id: string): Promise<boolean> {
    return this.forms.delete(id);
  }

  // Contract methods
  async getContractsByClientId(clientId: string): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      (contract) => contract.clientId === clientId,
    );
  }

  async getContract(id: string): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const id = randomUUID();
    const contract: Contract = { 
      ...insertContract, 
      id,
      createdAt: new Date(),
      status: insertContract.status || "draft",
      docusignEnvelopeId: insertContract.docusignEnvelopeId || null,
      contractData: insertContract.contractData || null
    };
    this.contracts.set(id, contract);
    return contract;
  }

  async updateContract(id: string, updates: Partial<Contract>): Promise<Contract | undefined> {
    const contract = this.contracts.get(id);
    if (!contract) return undefined;
    
    const updatedContract = { ...contract, ...updates };
    this.contracts.set(id, updatedContract);
    return updatedContract;
  }

  // Waitlist methods
  async createWaitlistSignup(insertWaitlist: InsertWaitlist): Promise<WaitlistSignup> {
    const id = randomUUID();
    const signup: WaitlistSignup = { 
      ...insertWaitlist, 
      id,
      createdAt: new Date()
    };
    
    // Store in memory
    this.waitlistSignups.set(id, signup);
    
    // Also store in Replit DB
    try {
      const dbResult = await this.db.get("waitlistEmails");
      const existingEmails: any[] = Array.isArray(dbResult) ? dbResult : [];
      const updatedEmails = [...existingEmails, {
        email: signup.email,
        id: signup.id,
        createdAt: signup.createdAt.toISOString()
      }];
      await this.db.set("waitlistEmails", updatedEmails);
    } catch (error) {
      console.error("Error storing waitlist email in Replit DB:", error);
    }
    
    return signup;
  }

  async getWaitlistSignups(): Promise<WaitlistSignup[]> {
    return Array.from(this.waitlistSignups.values());
  }

  // Form submission methods
  async createFormSubmission(insertSubmission: InsertFormSubmission): Promise<FormSubmission> {
    const id = randomUUID();
    const submission: FormSubmission = {
      ...insertSubmission,
      id,
      submittedAt: new Date(),
      contractGenerated: false,
      contractUrl: null,
      calendlyLink: insertSubmission.calendlyLink || null
    };
    this.formSubmissions.set(id, submission);
    return submission;
  }

  async getFormSubmissions(userId: string): Promise<FormSubmission[]> {
    // Get submissions for forms owned by this user
    const userForms = Array.from(this.forms.values()).filter(form => form.userId === userId);
    const userFormIds = new Set(userForms.map(form => form.id));
    
    return Array.from(this.formSubmissions.values())
      .filter(submission => userFormIds.has(submission.formId))
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  async getFormSubmissionById(id: string): Promise<FormSubmission | undefined> {
    return this.formSubmissions.get(id);
  }

  async updateFormSubmission(id: string, updates: Partial<FormSubmission>): Promise<FormSubmission> {
    const submission = this.formSubmissions.get(id);
    if (!submission) {
      throw new Error(`Form submission with id ${id} not found`);
    }
    const updatedSubmission = { ...submission, ...updates };
    this.formSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  // Shared form methods
  async shareFormToUser(sharedForm: InsertSharedForm): Promise<SharedForm> {
    const id = randomUUID();
    const newSharedForm: SharedForm = {
      ...sharedForm,
      id,
      sentAt: new Date(),
      viewedAt: null,
      status: "pending",
    };

    this.sharedForms.set(id, newSharedForm);
    return newSharedForm;
  }

  async getSharedFormsForUser(recipientId: string): Promise<(SharedForm & { form: Form; sender: User })[]> {
    const sharedForms = Array.from(this.sharedForms.values())
      .filter(sf => sf.recipientId === recipientId);

    const result = [];
    for (const sharedForm of sharedForms) {
      const form = this.forms.get(sharedForm.formId);
      const sender = this.users.get(sharedForm.senderId);
      
      if (form && sender) {
        result.push({
          ...sharedForm,
          form,
          sender,
        });
      }
    }

    return result;
  }

  async getSharedForm(id: string): Promise<SharedForm | undefined> {
    return this.sharedForms.get(id);
  }

  async deleteSharedForm(id: string, userId: string): Promise<boolean> {
    const sharedForm = this.sharedForms.get(id);
    if (!sharedForm) {
      throw new Error("Shared form not found");
    }
    
    // Verify the user is the recipient of the shared form
    if (sharedForm.recipientId !== userId) {
      throw new Error("You don't have permission to delete this shared form");
    }
    
    return this.sharedForms.delete(id);
  }
}

export const storage = new MemStorage();
