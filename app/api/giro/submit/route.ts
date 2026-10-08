import { handler } from '@/lib/giro/http';
import { submit } from '@/lib/giro/service';

export const dynamic = 'force-dynamic';
export const POST = handler(submit);
