import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import InputField from '../../components/shared/InputField';
import { z } from 'zod';
import { resetPasswordSchema } from '@form-builder/validation/src/index';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import axios from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { isAxiosError } from 'axios';
import useTitle from '../../hooks/useTitle';

type ResetFormType = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  useTitle('Şifreyi Yenile');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResetFormType>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ResetFormType) =>
      axios.patch(`/auth/reset-password/${token}`, data, {
        headers: { 'Content-Type': 'application/json' },
      }),
  });

  const onSubmit: SubmitHandler<ResetFormType> = data => {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success('Şifre başarıyla sıfırlandı!');
        navigate('/login');
      },
      onError: err => {
        if (isAxiosError(err)) {
          const errors = err.response?.data?.errors;
          if (errors)
            for (const error in errors)
              setError(error as 'newPassword' | 'cNewPassword', {
                message: errors[error][0],
              });

          let errorMsg =
            (err.response?.data?.message as string) ||
            'Şifre sıfırlama başarısız oldu!';
          if (!err.response) errorMsg = 'Bağlantı hatası!';
          toast.error(errorMsg);
        }
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Hesabı Sıfırla</CardTitle>
          <CardDescription>Hesabınız için yeni şifreyi girin</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InputField
            label="Yeni şifre"
            type="password"
            className="text-slate-600"
            errorMessage={errors.newPassword?.message}
            disabled={mutation.isPending}
            {...register('newPassword')}
          />
          <InputField
            label="Yeni Şifre Tekrar"
            type="password"
            className="text-slate-600"
            errorMessage={errors.cNewPassword?.message}
            disabled={mutation.isPending}
            {...register('cNewPassword')}
          />
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            isLoading={mutation.isPending}
          >
            Şifreyi Resetle
          </Button>
          <div className="flex justify-center gap-2 text-sm">
            <p className="text-muted-foreground">Şifrenizi hatırladınız mı?</p>
            <Link className="text-primary hover:underline" to="/login">
              Giriş Yap
            </Link>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
