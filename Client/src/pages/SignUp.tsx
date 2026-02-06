import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Boxes, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // User Info
    name: '',
    email: '',
    password: '',
    // Business Info
    businessName: '',
    industry: '',
    location: '',
    currency: 'USD',
    stockAlertPreference: 'medium',
    aiAssistedReorder: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      // Validate step 1 fields
      if (!formData.name || !formData.email || !formData.password) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
      if (formData.password.length < 6) {
        toast({
          title: 'Validation Error',
          description: 'Password must be at least 6 characters',
          variant: 'destructive',
        });
        return;
      }
      setStep(2);
    } else {
      // Validate step 2 fields
      if (!formData.businessName || !formData.industry || !formData.location) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all business details',
          variant: 'destructive',
        });
        return;
      }

      // Submit to API
      setIsLoading(true);
      try {
        const response = await authApi.signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'OWNER',
          businessName: formData.businessName,
          industry: formData.industry,
          location: formData.location,
          currency: formData.currency,
        });

        // Store in auth context (also persists to localStorage)
        login(response.token, response.user as any);

        toast({
          title: 'Success!',
          description: 'Your account has been created successfully',
        });

        // Redirect based on role
        navigate('/sme/dashboard');
      } catch (error) {
        toast({
          title: 'Registration Failed',
          description: error instanceof Error ? error.message : 'Something went wrong',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-hero">
              <Boxes className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">ChainMind</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {step === 1 ? 'Create your account' : 'Set up your business'}
          </h1>
          <p className="text-muted-foreground">
            {step === 1 
              ? 'Start your journey to smarter inventory management' 
              : 'Tell us about your business to personalize your experience'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Your Business Name"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="fmcg">FMCG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stockAlert">Stock Alert Level</Label>
                    <Select
                      value={formData.stockAlertPreference}
                      onValueChange={(value) => setFormData({ ...formData, stockAlertPreference: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <Label htmlFor="aiReorder" className="font-medium">AI-Assisted Reordering</Label>
                    <p className="text-sm text-muted-foreground">
                      Let AI suggest optimal reorder points
                    </p>
                  </div>
                  <Switch
                    id="aiReorder"
                    checked={formData.aiAssistedReorder}
                    onCheckedChange={(checked) => setFormData({ ...formData, aiAssistedReorder: checked })}
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Business
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>

          {step === 1 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
