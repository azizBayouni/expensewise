
'use client';

import Link from 'next/link'

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUpWithUsername, continueWithGoogle } from '@/services/auth-service';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function SignupPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signUpWithUsername(username, password);
            router.push('/');
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Signup Failed",
                description: error.message,
                variant: "destructive"
            })
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleGoogleSignIn = async () => {
        try {
        await continueWithGoogle();
        router.push('/');
        } catch (error: any) {
        console.error(error);
        toast({
            title: "Sign-in Failed",
            description: error.message,
            variant: "destructive"
        })
        }
    }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" placeholder="johndoe" required value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                 <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create an account'}
                </Button>
                <div className="relative">
                    <Separator />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-card text-muted-foreground text-sm">
                        OR
                    </div>
                </div>
                <Button variant="outline" className="w-full" type="button" onClick={handleGoogleSignIn}>
                    Continue with Google
                </Button>
            </CardContent>
             <CardFooter>
                <div className="text-center text-sm w-full">
                    Already have an account?{" "}
                    <Link href="/login" className="underline">
                        Log in
                    </Link>
                </div>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
