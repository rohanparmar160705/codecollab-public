import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { login as loginApi, oauthPopupLogin } from "@/services/authService";
import { getProfile } from "@/services/usersService";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/slices/authSlice";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await loginApi({ email: formData.email, password: formData.password });
      const accessToken = res?.accessToken;
      const user = res?.user;
      if (accessToken && user) {
        // Save to Redux for app state; token is already persisted by authService
        dispatch(setCredentials({ user, accessToken }));
        try { localStorage.setItem("userId", String(user.id || user.userId || "")); } catch {}
      }
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      // Guard will route to /billing if subscription inactive
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setIsLoading(true);
    try {
      await oauthPopupLogin(provider);
      const user = await getProfile();
      const accessToken = localStorage.getItem("accessToken") || undefined;
      if (user && accessToken) {
        dispatch(setCredentials({ user, accessToken }));
      }
      toast({ title: `Signed in with ${provider}`, description: "Welcome to CodeCollab." });
      navigate("/dashboard");
    } catch (e) {
      toast({ title: `Sign in with ${provider} failed`, description: "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-aurora">
      <Card className="w-full max-w-md border-border/50 elevation-2">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Code2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to CodeCollab</CardTitle>
          <CardDescription>Sign in to start collaborating on code</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <div className="my-4 text-center text-xs text-muted-foreground">or</div>
          <div className="grid grid-cols-1 gap-2">
            <Button type="button" variant="outline" className="w-full" disabled={isLoading} onClick={() => handleOAuth("google")}>
              Continue with Google
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={isLoading} onClick={() => handleOAuth("github")}>
              Continue with GitHub
            </Button>
          </div>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
