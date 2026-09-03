import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants/metadata.constants';

/** Mark a resolver/handler as public (skips authentication). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
