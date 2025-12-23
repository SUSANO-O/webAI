'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormEvent, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader, Eye, EyeOff, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('yy@yy.yy');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  // Validación de email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length > 0;
  };

  // Validación de password
  const validatePassword = (password: string) => {
    return password.length >= 6; // Mínimo 6 caracteres
  };

  // Validar email cuando cambia
  useEffect(() => {
    setIsEmailValid(validateEmail(email));
  }, [email]);

  // Validar password cuando cambia
  useEffect(() => {
    setIsPasswordValid(validatePassword(password));
  }, [password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid username or password. Please try again.',
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            {/* Título */}
            <h1 className="text-xl font-semibold text-gray-800 text-center">Init session</h1>

            {/* Campo Email */}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="yy@yy.yy"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "bg-blue-50/50 pr-10",
                    isEmailValid
                      ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                      : "border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  )}
                />
                {isEmailValid && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              {isEmailValid && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Email válido</span>
                </div>
              )}
            </div>

            {/* Campo Password con icono de ojo */}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "bg-blue-50/50 pr-20",
                    isPasswordValid
                      ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                      : "border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {isPasswordValid && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {isPasswordValid && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Contraseña válida</span>
                </div>
              )}
            </div>

            {/* Botón Login */}
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </CardContent>

          {/* Footer con enlaces */}
          <CardFooter className="flex justify-center gap-2 pb-6 pt-0">
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Register
            </button>
            <span className="text-gray-400">|</span>
            <button
              type="button"
              onClick={() => router.push('/change-password')}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Change Password
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
