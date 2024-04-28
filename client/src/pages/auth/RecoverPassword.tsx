import { Link } from 'react-router-dom';
import InputField from '../../components/shared/InputField';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { forgotPasswordSchema } from '@form-builder/validation/src/index';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import axios from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { isAxiosError } from 'axios';
import useTitle from '../../hooks/useTitle';

type RecoverFormType = z.infer<typeof forgotPasswordSchema>;

export default function RecoverPassword() {
  useTitle('Parolanızı mı unuttunuz?');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<RecoverFormType>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: RecoverFormType) =>
      axios.post('/auth/forgot-password', data, {
        headers: { 'Content-Type': 'application/json' },
      }),
  });

  const onSubmit: SubmitHandler<RecoverFormType> = data => {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success('Email başarıyla gönderildi');
        reset();
      },
      onError: err => {
        if (isAxiosError(err)) {
          const errors = err.response?.data?.errors;
          if (errors)
            for (const error in errors)
              setError(error as 'email', {
                message: errors[error][0],
              });

          let errorMsg =
            (err.response?.data?.message as string) || 'İstek başarısız oldu!';
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
          <CardTitle>Hesabı Kurtar</CardTitle>
          <CardDescription>
            Hesabı kurtarmak için e-postanızı girin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InputField
            label="Email"
            type="email"
            className="text-slate-600"
            errorMessage={errors.email?.message}
            disabled={mutation.isPending}
            {...register('email')}
          />
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            isLoading={mutation.isPending}
          >
            Şifre Kurtarma
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
