import { handler } from '@/lib/giro/http';
import { status } from '@/lib/giro/service';

export const dynamic = 'force-dynamic';
export const POST = handler(status);
