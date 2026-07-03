import AuthScreen from '@/components/organisms/authScreen';
import { SIGN_UP_CONTENT } from './data/content';

// Sign-up page: a branded split screen that lets visitors register as a client
// or apply as a vendor. Layout + choices live in the shared AuthScreen organism;
// this container only supplies the content.
export default function SignUpContainer() {
  return <AuthScreen {...SIGN_UP_CONTENT} />;
}
