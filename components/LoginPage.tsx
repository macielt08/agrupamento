import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { loginUser, LoginUserOutputType, registerUser, resetUserPin } from 'zite-endpoints-sdk';
type UserType = {
  id: number;
  nome?: string;
  pin?: number;
  email?: string;
  seccao?: string;
  admin?: string;
  subAdmin?: string;
  programer?: string;
  estado?: string;
  menuFinancas?: string;
  menuElemento?: string;
  menuSpp?: string;
  menuAtividades?: string;
  menuNoitesCampo?: string;
};
type LoginPageProps = {
  onLoginSuccess: (user: UserType) => void;
};
export default function LoginPage({
  onLoginSuccess
}: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-pin'>('login');
  const [pin, setPin] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [seccao, setSeccao] = useState('');
  const [nin, setNin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pin) {
      toast.error('Por favor insira o seu email e PIN');
      return;
    }
    setLoading(true);
    try {
      const result = await loginUser({
        email: email.trim(),
        pin: pin.trim()
      });
      if (result.success && 'user' in result && result.user) {
        localStorage.setItem('financeflow_user', JSON.stringify(result.user));
        toast.success('Login efetuado com sucesso!');
        onLoginSuccess(result.user);
      } else {
        toast.error(result.message || 'Email ou PIN incorretos');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao efetuar login';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !pin || !email || !seccao) {
      toast.error('Por favor preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      const result = await registerUser({
        nome,
        pin,
        email,
        seccao,
        nin: nin || undefined
      });
      if (result.success) {
        toast.success('Conta criada com sucesso! Por favor, faça login com o seu PIN.');
        resetForm();
        setMode('login');
      } else {
        const errorMessage = 'message' in result ? result.message : 'Erro ao criar conta';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('Erro ao criar conta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor insira o seu email');
      return;
    }
    if (!newPin || !confirmPin) {
      toast.error('Por favor preencha o novo PIN e a confirmação');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Os PINs não coincidem');
      return;
    }
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast.error('O PIN deve ter 4 dígitos e não pode iniciar com 0');
      return;
    }
    setLoading(true);
    try {
      const result = await resetUserPin({
        email,
        newPin
      });
      if (result.success) {
        toast.success('PIN atualizado com sucesso! Por favor, faça login com o novo PIN.');
        resetForm();
        setMode('login');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao redefinir PIN');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const resetForm = () => {
    setPin('');
    setNome('');
    setEmail('');
    setSeccao('');
    setNin('');
    setNewPin('');
    setConfirmPin('');
  };
  const toggleMode = (newMode: 'login' | 'signup' | 'forgot-pin') => {
    setMode(newMode);
    resetForm();
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted to-secondary px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src="https://images.fillout.com/orgid-488337/flowpublicid-5ipoddzhpg/widgetid-default/1d6HSLZAvpzehbf7BtSEm9/pasted-image-1761781303231.png" alt="Agrupamento 1280" className="h-24 w-24 object-contain" />
          </div>
          <CardTitle className="text-2xl">Agupamento 1280</CardTitle>
          <CardDescription>
            {mode === 'login' && 'Entre com o seu Email e PIN'}
            {mode === 'signup' && 'Criar nova conta'}
            {mode === 'forgot-pin' && 'Redefinir PIN'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'login' && <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input id="pin" type="password" inputMode="numeric" pattern="[0-9]*" placeholder="****" value={pin} onChange={e => setPin(e.target.value)} disabled={loading} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A entrar...
                  </> : 'Entrar'}
              </Button>
              <div className="flex justify-between items-center text-sm">
                <Button type="button" variant="link" onClick={() => toggleMode('forgot-pin')} disabled={loading} className="p-0 h-auto">
                  Esqueci o PIN
                </Button>
                <Button type="button" variant="link" onClick={() => toggleMode('signup')} disabled={loading} className="p-0 h-auto">
                  Criar nova conta
                </Button>
              </div>
            </form>}

          {mode === 'signup' && <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" type="text" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} disabled={loading} autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seccao">Secção</Label>
                <Select value={seccao} onValueChange={setSeccao} disabled={loading}>
                  <SelectTrigger id="seccao">
                    <SelectValue placeholder="Selecione a secção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Agrupamento">Agrupamento</SelectItem>
                    <SelectItem value="Lobitos">Lobitos</SelectItem>
                    <SelectItem value="Exploradores">Exploradores</SelectItem>
                    <SelectItem value="Pioneiros">Pioneiros</SelectItem>
                    <SelectItem value="Caminheiros">Caminheiros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nin" className=''>NIN (opcional)</Label>
                <Input id="nin" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Número de Identificação" value={nin} onChange={e => setNin(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-pin" className=''>PIN (mínimo 4 dígitos)</Label>
                <Input id="signup-pin" type="password" inputMode="numeric" pattern="[0-9]*" placeholder="****" value={pin} onChange={e => setPin(e.target.value)} disabled={loading} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A criar conta...
                  </> : 'Criar Conta'}
              </Button>
              <div className="text-center">
                <Button type="button" variant="link" onClick={() => toggleMode('login')} disabled={loading}>
                  Já tem conta? Entrar
                </Button>
              </div>
            </form>}

          {mode === 'forgot-pin' && <form onSubmit={handleForgotPin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pin" className=''>Novo PIN (mínimo 4 dígitos)</Label>
                <Input id="new-pin" type="password" inputMode="numeric" pattern="[0-9]*" placeholder="****" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Confirmar PIN</Label>
                <Input id="confirm-pin" type="password" inputMode="numeric" pattern="[0-9]*" placeholder="****" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} disabled={loading} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A redefinir...
                  </> : 'Redefinir PIN'}
              </Button>
              <div className="text-center">
                <Button type="button" variant="link" onClick={() => toggleMode('login')} disabled={loading}>
                  Voltar ao login
                </Button>
              </div>
            </form>}
        </CardContent>
      </Card>
    </div>;
}
