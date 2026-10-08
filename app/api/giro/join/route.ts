import { handler } from '@/lib/giro/http';
import { join } from '@/lib/giro/service';

export const dynamic = 'force-dynamic';
export const POST = handler(join);
