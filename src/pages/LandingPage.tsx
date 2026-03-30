import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui-components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui-components/card';
import { Input } from '@/components/ui-components/input';
import { Label } from '@/components/ui-components/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-components/tabs';
import { toast } from 'sonner';
import { CheckCircle2, Copy, ArrowRight, Lock } from 'lucide-react';

// Force GitHub sync to recognize ui-core changes
export default function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [trxId, setTrxId] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !trxId) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        email,
        method,
        trxId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Transaction submitted! We will email your license key within 24 hours.');
      setEmail('');
      setTrxId('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center"
      >
        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
            v1.0 is live
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            The Ultimate AI Tool for Creators.
          </h1>
          <p className="text-lg text-slate-600">
            Bring your own API key and pay a one-time fee for lifetime access to the UI. No subscriptions, no hidden fees.
          </p>
          <ul className="space-y-3 text-slate-600">
            {['Bring Your Own Key (BYOK)', 'No monthly subscriptions', 'Lifetime updates included', 'Secure local storage'].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4 flex gap-4">
            <Button variant="outline" onClick={() => navigate('/unlock')} className="w-full sm:w-auto">
              <Lock className="w-4 h-4 mr-2" />
              I already have a key
            </Button>
          </div>
        </div>

        <Card className="w-full shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle>Get Lifetime Access</CardTitle>
            <CardDescription>Choose your preferred payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="international" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="international">International</TabsTrigger>
                <TabsTrigger value="bangladesh">Bangladesh</TabsTrigger>
              </TabsList>
              
              <TabsContent value="international" className="space-y-4">
                <div className="text-center py-6 space-y-4">
                  <div className="text-4xl font-bold">$10<span className="text-lg text-slate-500 font-normal">/lifetime</span></div>
                  <p className="text-sm text-slate-500">Pay securely via Gumroad. You will receive your license key instantly via email.</p>
                  <Button className="w-full" size="lg" onClick={() => window.open('https://gumroad.com', '_blank')}>
                    Buy with Gumroad <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="bangladesh" className="space-y-4">
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold">৳1000<span className="text-lg text-slate-500 font-normal">/lifetime</span></div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg border space-y-3 text-sm">
                  <p className="font-medium text-slate-900">1. Send Money (Personal)</p>
                  <div className="flex items-center justify-between bg-white p-2 rounded border">
                    <span className="font-mono">01700000000</span>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy('01700000000')}><Copy className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant={method === 'bkash' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setMethod('bkash')}
                    >
                      bKash
                    </Button>
                    <Button 
                      variant={method === 'nagad' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setMethod('nagad')}
                    >
                      Nagad
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                    <p className="text-xs text-slate-500">We will send your license key here.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trxId">Transaction ID (TrxID)</Label>
                    <Input 
                      id="trxId" 
                      placeholder="e.g. 8A7B6C5D4E" 
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Verify Payment'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
      
      <footer className="mt-12 text-slate-400 text-xs flex gap-4">
        <span>&copy; 2026 AI Creator Tool</span>
        <button 
          onClick={() => navigate('/admin')}
          className="hover:text-slate-600 transition-colors underline underline-offset-2"
        >
          Admin Login
        </button>
      </footer>
    </div>
  );
}
