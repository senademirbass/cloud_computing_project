import { Trash2Icon } from 'lucide-react';
import ChangePassword from '../components/settings/ChangePassword';
import ProfileDetails from '../components/settings/ProfileDetails';
import { Button } from '../components/ui/Button';
import useTitle from '../hooks/useTitle';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/AlertDialog';
import { useMutation } from '@tanstack/react-query';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import useLogout from '../hooks/useLogout';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const axiosPrivate = useAxiosPrivate();
  const logout = useLogout();

  useTitle('Ayarlar | AnketKOU');

  const { mutate, isPending } = useMutation({
    mutationFn: () => axiosPrivate.delete('/user/delete-account'),
    onSuccess: () => toast.success('Hesap başarıyla silindi'),
    onError: () => toast.error('Hesap silinirken hata oluştu'),
  });

  return (
    <div className="mt-1">
      <section className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Hesap Ayarları</h1>
          <p className="text-muted-foreground">
            Profil bilgilerinizi yönetin veya şifrenizi değiştirin
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 text-destructive hover:bg-red-50 hover:text-destructive"
            >
              <Trash2Icon className="h-5 w-5" />
              <span>Hesabımı sil</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Silmek istiyor musunuz?</AlertDialogTitle>
              <AlertDialogDescription>
                Hesabınızı silmek istediğinizden emin misiniz? Bu eylem geri
                alınamaz ve hesabınızla ilişkili tüm veriler de dahil olmak
                üzere kalıcı olarak kaybedilmesine yol açacaktır.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:space-x-4">
              <Button
                variant="destructive"
                isLoading={isPending}
                onClick={() => {
                  mutate();
                  logout();
                }}
              >
                Evet, sil
              </Button>
              <AlertDialogCancel disabled={isPending}>Vazgeç</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
      <section className="mt-6 space-y-8 rounded-lg border p-8 pt-6">
        <ProfileDetails />
        <ChangePassword />
      </section>
    </div>
  );
}
