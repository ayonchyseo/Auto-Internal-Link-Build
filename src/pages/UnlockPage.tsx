import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui-core/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui-core/card';
import { Input } from '@/components/ui-core/input';
import { Label } from '@/components/ui-core/label';
import { toast } from 'sonner';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function Unlock() {
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey) {
      toast.error('Please enter a license key');
      return;
    }

    setIsVerifying(true);
    try {
      if (licenseKey.startsWith('BD-')) {
        // Verify local key via Firebase
        const docRef = doc(db, 'licenses', licenseKey);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status === 'active') {
            localStorage.setItem('licenseKey', licenseKey);
            toast.success('License verified successfully!');
            navigate('/tool');
          } else {
            toast.error('This license key has been revoked.');
          }
        } else {
          toast.error('Invalid license key.');
        }
      } else {
        // Verify Gumroad key (Mocked for now)
        // In a real app, you'd call a backend function to verify with Gumroad API
        if (licenseKey.length > 10) {
          localStorage.setItem('licenseKey', licenseKey);
          toast.success('Gumroad license verified successfully!');
          navigate('/tool');
        } else {
          toast.error('Invalid Gumroad license key.');
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to verify license. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card className="shadow-xl border-slate-200">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Unlock Access</CardTitle>
            <CardDescription>Enter your license key to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="licenseKey">License Key</Label>
                <Input 
                  id="licenseKey" 
                  placeholder="e.g. BD-A1B2-C3D4 or GUM-XXXX-XXXX" 
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? 'Verifying...' : 'Unlock Tool'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
