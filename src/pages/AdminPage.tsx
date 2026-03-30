import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui-core/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-core/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui-core/Table';
import { Badge } from '@/components/ui-core/Badge';
import { toast } from 'sonner';
import { ShieldAlert, CheckCircle, XCircle, Copy } from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || user.email !== 'ayonchy@gmail.com') return;

    const qTx = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qLic = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'));
    const unsubLic = onSnapshot(qLic, (snapshot) => {
      setLicenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTx();
      unsubLic();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      toast.error('Login failed');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const generateLicenseKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomStr = (len: number) => Array.from({ length: len }).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `BD-${randomStr(4)}-${randomStr(4)}`;
  };

  const handleApprove = async (txId: string, email: string) => {
    try {
      const newKey = generateLicenseKey();
      
      // 1. Create License
      await setDoc(doc(db, 'licenses', newKey), {
        key: newKey,
        email,
        status: 'active',
        createdAt: serverTimestamp()
      });

      // 2. Update Transaction
      await updateDoc(doc(db, 'transactions', txId), {
        status: 'approved'
      });

      toast.success(`Approved! Key generated: ${newKey}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to approve transaction');
    }
  };

  const handleReject = async (txId: string) => {
    try {
      await updateDoc(doc(db, 'transactions', txId), {
        status: 'rejected'
      });
      toast.success('Transaction rejected');
    } catch (error) {
      console.error(error);
      toast.error('Failed to reject transaction');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user || user.email !== 'ayonchy@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Admin Access Only</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-center text-slate-500">You must be logged in as ayonchy@gmail.com to access this page.</p>
            <Button onClick={handleLogin} className="w-full">Login with Google</Button>
            <Button variant="ghost" onClick={() => navigate('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Pending Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>TrxID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.filter(t => t.status === 'pending').map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.email}</TableCell>
                      <TableCell className="uppercase text-xs font-bold">{tx.method}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.trxId}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleApprove(tx.id, tx.email)}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(tx.id)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.filter(t => t.status === 'pending').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-4">No pending transactions</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((lic) => (
                    <TableRow key={lic.id}>
                      <TableCell className="font-mono text-xs flex items-center gap-2">
                        {lic.key}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lic.key)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm">{lic.email}</TableCell>
                      <TableCell>
                        <Badge variant={lic.status === 'active' ? 'default' : 'destructive'}>
                          {lic.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {licenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500 py-4">No licenses generated yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
