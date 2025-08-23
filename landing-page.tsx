import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  Rocket, 
  Play, 
  Edit, 
  FileText, 
  Calendar,
  Users,
  Lock,
  Check,
  Star
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-primary">ClientZap</div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#features" className="text-slate-600 hover:text-primary px-3 py-2 text-sm font-medium">
                  Features
                </a>
                <Link href="/auth">
                  <Button variant="outline" size="sm" data-testid="button-signin">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button size="sm" data-testid="button-create-account">
                    Create Your Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            <div className="lg:col-span-6">
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
                Automate Freelancer{" "}
                <span className="text-primary">Onboarding</span>{" "}
                in Minutes
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Create branded intake forms, automate contract generation, and streamline scheduling. 
                Complete client onboarding automation that saves 5+ hours per week.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/auth">
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-4 w-full sm:w-auto"
                    data-testid="button-get-started-free"
                  >
                    Create Your Free Account
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-4 w-full sm:w-auto"
                  onClick={() => document.getElementById('features')?.scrollIntoView()}
                  data-testid="button-learn-more"
                >
                  Learn More
                </Button>
              </div>
              <div className="flex items-center justify-center sm:justify-start text-sm text-slate-500 space-x-1">
                <span className="text-emerald-500">✅</span>
                <span>No credit card required</span>
                <span>•</span>
                <span className="text-blue-500">🔒</span>
                <span>Secure & Private</span>
                <span>•</span>
                <span className="text-purple-500">💼</span>
                <span>Built for freelancers</span>
              </div>
            </div>
            <div className="lg:col-span-6 mt-12 lg:mt-0">
              <div className="relative">
                <img 
                  src="/hero-dashboard.svg" 
                  alt="ClientZap Dashboard - Professional client onboarding interface with form builder, analytics, and client management" 
                  className="rounded-xl shadow-2xl border border-slate-200 w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call-to-Action Section */}
      <div className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            Ready to automate your client onboarding?
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of freelancers who save hours every week with ClientZap's automation tools.
          </p>
          <Link href="/auth">
            <Button 
              size="lg" 
              className="text-xl px-12 py-6 mb-8"
              data-testid="button-get-started-free-cta"
            >
              <Rocket className="mr-3 h-6 w-6" />
              Create Your Free Account
            </Button>
          </Link>
          <div className="flex items-center justify-center text-base text-slate-600 space-x-2">
            <span className="text-emerald-500 text-lg">✅</span>
            <span>No credit card required</span>
            <span className="text-slate-400">•</span>
            <span className="text-blue-500 text-lg">🔒</span>
            <span>Secure & Private</span>
            <span className="text-slate-400">•</span>
            <span className="text-purple-500 text-lg">💼</span>
            <span>Built for freelancers</span>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to onboard clients professionally
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              From intake forms to signed contracts, ClientZap automates your entire client onboarding workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-slate-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-6">
                  <Edit className="text-white text-xl" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Custom Intake Forms</h3>
                <p className="text-slate-600 mb-4">
                  Create beautiful, branded intake forms with our drag-and-drop builder. Collect all the information you need upfront.
                </p>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li><Check className="text-emerald-500 mr-2 h-4 w-4 inline" />Drag & drop form builder</li>
                  <li><Check className="text-emerald-500 mr-2 h-4 w-4 inline" />Custom branding</li>
                  <li><Check className="text-emerald-500 mr-2 h-4 w-4 inline" />Shareable links</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-6">
                  <FileText className="text-white text-xl" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Smart Contracts</h3>
                <p className="text-slate-600 mb-4">
                  Generate professional contracts automatically from form data. Send for e-signature with DocuSign integration.
                </p>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li><Check className="text-emerald-500 mr-2 h-4 w-4 inline" />Auto-generated contracts</li>
                  <li><Check className="text-emerald-500 mr-2 h-4 w-4 inline" />DocuSign integration</li>
                  <li><Check className="text-emerald-500 mr-2 h-4 w-4 inline" />Template library</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-6">
                  <Calendar className="text-white text-xl" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Seamless Scheduling</h3>
                <p className="text-slate-600 mb-4">
                  Let clients book discovery calls automatically after completing forms. Calendly integration included.
                </p>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li><Check className="text-emerald-500 mr-2 h-4 w-4 inline" />Calendly integration</li>
                  <li><Check className="text-emerald-500 mr-2 h-4 w-4 inline" />Automated booking</li>
                  <li><Check className="text-emerald-500 mr-2 h-4 w-4 inline" />Calendar sync</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Testimonial Section */}
      <div className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
            ))}
          </div>
          <blockquote className="text-2xl md:text-3xl font-medium text-slate-900 mb-8">
            "ClientZap saved me 2 hours per client! My onboarding process went from chaotic to completely streamlined."
          </blockquote>
          <div className="flex items-center justify-center">
            <img 
              src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150" 
              alt="Sarah Johnson - Freelance Designer" 
              className="w-16 h-16 rounded-full mr-4"
            />
            <div className="text-left">
              <div className="font-semibold text-slate-900">Sarah Johnson</div>
              <div className="text-slate-600">Freelance Designer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Final Call-to-Action Section */}
      <div className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Start automating your client onboarding today
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of freelancers who save 5+ hours per week with ClientZap.
          </p>
          
          <Link href="/auth">
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-primary hover:bg-gray-100 px-12 py-4 text-xl mb-6"
              data-testid="button-final-cta"
            >
              <Rocket className="mr-2 h-6 w-6" />
              Create Your Free Account
            </Button>
          </Link>
          
          <div className="flex items-center justify-center text-blue-100 text-sm space-x-2">
            <span className="text-green-300">✅</span>
            <span>No credit card required</span>
            <span>•</span>
            <span className="text-blue-200">🔒</span>
            <span>Secure & Private</span>
          </div>
        </div>
      </div>
    </div>
  );
}
