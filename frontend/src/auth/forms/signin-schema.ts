import { z } from 'zod';

export const getSigninSchema = () => {
  return z.object({
    email: z
      .string()
      .email({ message: 'Informe um e-mail válido.' })
      .min(1, { message: 'O e-mail é obrigatório.' }),
    password: z.string().min(1, { message: 'A senha é obrigatória.' }),
    rememberMe: z.boolean().optional(),
  });
};

export type SigninSchemaType = z.infer<ReturnType<typeof getSigninSchema>>;
