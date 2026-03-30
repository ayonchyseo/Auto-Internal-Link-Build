import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkLicense = async () => {
      const key = localStorage.getItem('licenseKey');
      if (!key) {
        navigate('/unlock');
        return;
      }

      try {
        if (key.startsWith('BD-')) {
          const docRef = doc(db, 'licenses', key);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists() && docSnap.data().status === 'active') {
            setIsVerified(true);
          } else {
            localStorage.removeItem('licenseKey');
            toast.error('Your license has been revoked or is invalid.');
            navigate('/unlock');
          }
        } else {
          // Mock Gumroad verification
          if (key.length > 10) {
            setIsVerified(true);
          } else {
            localStorage.removeItem('licenseKey');
            navigate('/unlock');
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Error verifying license.');
        navigate('/unlock');
      } finally {
        setIsChecking(false);
      }
    };

    checkLicense();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return isVerified ? <>{children}</> : null;
}
