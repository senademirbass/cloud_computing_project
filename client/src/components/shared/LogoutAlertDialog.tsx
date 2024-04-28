import useLogout from '../../hooks/useLogout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
  AlertDialogTitle,
} from '../ui/AlertDialog';

interface Props {
  children: React.ReactNode;
  closeHandler?: () => void;
}

export default function LogoutAlertDialog({ children, closeHandler }: Props) {
  const logout = useLogout();

  return (
    <AlertDialog
      onOpenChange={open => {
        if (!open && closeHandler) closeHandler();
      }}
    >
      <AlertDialogTrigger className="w-full">{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kesinlikle emin misin?</AlertDialogTitle>
          <AlertDialogDescription>
            Oturumu kapatmak mevcut oturumunuzu sonlandıracaktır ve hesabınıza
            erişmek için kimlik bilgilerinizi tekrar girmeniz gerekecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:space-x-4">
          <AlertDialogAction onClick={logout}>
            Evet, oturumu kapat
          </AlertDialogAction>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
