import crypto from 'crypto';
import { type Response, type Request, type NextFunction } from 'express';
import { hash, compare } from 'bcrypt';
import {
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
} from '@form-builder/validation';
import { sign, decode } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

import User from '../models/userModel';
import catchAsyncError from '../utils/catchAsyncError';
import AppError from '../utils/appError';
import {
  accessTokenExpiresIn,
  cookieOptions,
  refreshTokenExpiresIn,
} from '../utils/constants';
import sendEmail from '../utils/sendEmail';

export const signAccessToken = (id: string) =>
  sign({ id }, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: accessTokenExpiresIn,
  });

export const signRefreshToken = (id: string) =>
  sign({ id }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: refreshTokenExpiresIn,
  });

export const signUp = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await registerSchema.safeParseAsync(req.body);
    if (!result.success)
      return next(
        new AppError(
          'Doğrulama başarısız!',
          400,
          result.error.flatten().fieldErrors,
        ),
      );

    const foundUser = await User.findOne({ email: result.data.email }).exec();
    if (foundUser)
      return next(
        new AppError('Kullanıcı zaten var!', 409, {
          email: ['Bu e-posta zaten var'],
        }),
      );

    const { name, email } = result.data;
    const password = await hash(result.data.password, 12);

    const newUser = await User.create({ name, email, password });

    sendEmail({
      email: newUser.email,
      subject: `AnketKOU'ye hoşgeldiniz!`,
      message: `AnketKOU'ye katıldınız için teşekkür ederiz!`,
    });

    const newRefreshToken = signRefreshToken(newUser._id.toString());
    newUser.refreshToken = [newRefreshToken];
    await newUser.save();

    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    res.status(201).json({
      status: 'success',
      accessToken: signAccessToken(newUser._id.toString()),
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          avatar: newUser.avatar,
        },
      },
    });
  },
);

export const login = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cookies } = req;
    const { email, password } = req.body;

    if (!email || !password)
      return next(
        new AppError('Lütfen e-posta adresinizi ve şifrenizi girin!', 400),
      );

    const foundUser = await User.findOne({ email }).select('+password').exec();
    if (!foundUser || !(await compare(password, foundUser.password)))
      return next(new AppError('Yanlış eposta adresi veya şifre!', 401));

    const newRefreshToken = signRefreshToken(foundUser._id.toString());
    let newRefreshTokenArray = !cookies?.refreshToken
      ? foundUser.refreshToken
      : foundUser.refreshToken.filter(r => r !== cookies.refreshToken);
    if (cookies?.refreshToken) {
      /* For this scenario: 
        1) User logs in but never uses refresh token and does not log out
        2) Refresh token is stolen
        3) If 1 and 2 happen, reuse detection is needed to clear all refresh tokens when user logs in 
      */
      const foundToken = await User.findOne({
        refreshToken: cookies.refreshToken,
      }).exec();
      // Detected refresh token reuse
      if (!foundToken) newRefreshTokenArray = [];

      res.clearCookie('refreshToken', cookieOptions);
    }

    foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
    await foundUser.save();

    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    res.status(200).json({
      status: 'success',
      accessToken: signAccessToken(foundUser._id.toString()),
      data: {
        user: {
          id: foundUser._id,
          name: foundUser.name,
          email: foundUser.email,
          avatar: foundUser.avatar,
        },
      },
    });
  },
);

export const logout = catchAsyncError(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    res.sendStatus(204);
    return;
  }

  const foundUser = await User.findOne({ refreshToken }).exec();
  if (!foundUser) {
    res.clearCookie('refreshToken', cookieOptions);
    res.sendStatus(204);
    return;
  }

  foundUser.refreshToken = foundUser.refreshToken.filter(
    r => r !== refreshToken,
  );
  await foundUser.save();

  res.clearCookie('refreshToken', cookieOptions);
  res.sendStatus(204);
});

export const forgotPassword = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate email
    const result = await forgotPasswordSchema.safeParseAsync(req.body);
    if (!result.success)
      return next(
        new AppError(
          'Doğrulama başarısız!',
          400,
          result.error.flatten().fieldErrors,
        ),
      );

    // Get user based on email
    const foundUser = await User.findOne({ email: result.data.email }).exec();
    if (!foundUser)
      return next(
        new AppError('Bu e-posta adresine sahip kullanıcı yok!', 404),
      );

    // Generate random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    foundUser.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    foundUser.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await foundUser.save();

    // Send it to user's email
    const resetUrl = `${req.header('Referer')}reset-password/${resetToken}`;

    const message =
      `Bu e-postayı, Form Oluşturucu şifrenizi sıfırlama talebinde bulunduğunuz için alıyorsunuz. Şifrenizi sıfırlamak için lütfen aşağıdaki bağlantıya tıklayın veya URL'yi kopyalayıp yeni bir tarayıcı penceresine yapıştırın:\n\n` +
      `${resetUrl}\n\n` +
      'Eğer bunu talep etmediyseniz lütfen bu e-postayı dikkate almayın; şifreniz değişmeden kalacaktır.';

    try {
      await sendEmail({
        email: foundUser.email,
        subject:
          'Form Oluşturucu hesabı için parola sıfırlama belirteci (10 dakika süreyle geçerlidir)',
        message,
      });

      res.status(200).json({
        status: 'success',
        message: 'Email başarıyla gönderildi',
      });
    } catch (err) {
      foundUser.passwordResetToken = undefined;
      foundUser.passwordResetExpires = undefined;
      await foundUser.save();

      return next(
        new AppError(
          'E-posta gönderilirken bir hata oluştu. Daha sonra tekrar deneyin!',
          500,
        ),
      );
    }
  },
);

export const resetPassword = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const foundUser = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).exec();

    // If token has not expired, and there is user, and success in validation, set the new password
    if (!foundUser)
      return next(new AppError('Token geçersiz veya süresi dolmuş!', 400));

    // Validate password and confirm password
    const result = await resetPasswordSchema.safeParseAsync(req.body);
    if (!result.success)
      return next(
        new AppError(
          'Doğrulama başarısız!',
          400,
          result.error.flatten().fieldErrors,
        ),
      );

    foundUser.password = await hash(result.data.newPassword, 12);
    foundUser.passwordResetToken = undefined;
    foundUser.passwordResetExpires = undefined;
    foundUser.passwordChangedAt = new Date();
    await foundUser.save();

    res.status(200).json({
      status: 'success',
      message: 'Şifre başarıyla sıfırlandı',
    });
  },
);

export const googleLogin = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'postmessage',
    );

    const { tokens } = await oAuth2Client.getToken(req.body.code);
    if (!tokens.id_token)
      return next(new AppError(`Google'dan kullanıcı verileri alınamadı`, 500));

    const decoded = decode(tokens.id_token);
    console.log(decoded);

    res.status(200).json({
      status: 'success',
      data: tokens,
    });
  },
);
