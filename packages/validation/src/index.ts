import { z } from 'zod';

const password = z
  .string({ required_error: 'Lütfen bir şifre girin' })
  .regex(new RegExp('.*[A-Z].*'), 'Büyük harf karakter içermelidir')
  .regex(new RegExp('.*[a-z].*'), 'Küçük harf karakter içermelidir')
  .regex(new RegExp('.*\\d.*'), 'Bir sayı içermelidir')
  .regex(
    new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'),
    'Özel bir karakter içermelidir',
  )
  .min(8, 'Şifre en az 8 karakterden oluşmalı');

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Lütfen bize isminizi söyleyin' })
      .trim()
      .min(1, 'Lütfen bize isminizi söyleyin')
      .max(30),
    email: z
      .string({ required_error: 'Lütfen e-posta adresinizi girin' })
      .email('Lütfen geçerli eposta adresini giriniz'),
    password,
    cPassword: z.string({ required_error: 'Lütfen şifrenizi doğrulayınız' }),
  })
  .refine(({ password, cPassword }) => password === cPassword, {
    path: ['cPassword'],
    message: 'Şifre ve Şifreyi Onayla eşleşmelidir',
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Lütfen e-posta adresinizi girin' })
    .email('Lütfen geçerli eposta adresini giriniz'),
});

export const resetPasswordSchema = z
  .object({
    newPassword: password,
    cNewPassword: z.string({
      required_error: 'Lütfen yeni şifrenizi onaylayın',
    }),
  })
  .refine(({ newPassword, cNewPassword }) => newPassword === cNewPassword, {
    path: ['cNewPassword'],
    message: 'Yeni şifre ve Şifreyi onayla eşleşmelidir',
  });

export const changePasswordSchema = z
  .object({
    oldPassword: z.string({ required_error: 'Lütfen eski şifreyi girin' }),
    newPassword: password,
    cNewPassword: z.string({
      required_error: 'Lütfen yeni şifrenizi onaylayın',
    }),
  })
  .refine(({ newPassword, cNewPassword }) => newPassword === cNewPassword, {
    path: ['cNewPassword'],
    message: 'Yeni şifre ve Şifreyi onayla eşleşmelidir',
  });

export const userProfileSchema = z.object({
  name: z
    .string({ required_error: 'Lütfen bize isminizi söyleyin' })
    .trim()
    .min(1, 'Lütfen bize isminizi söyleyin')
    .max(30)
    .optional(),
  email: z
    .string({ required_error: 'Lütfen bize isminizi söyleyin' })
    .email('Lütfen geçerli eposta adresini giriniz')
    .optional(),
});
