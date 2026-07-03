import AuthScreen from '@/components/organisms/authScreen';
import { SIGN_IN_CONTENT } from './data/content';

// Sign-in page: a branded split screen that lets clients and vendors choose how
// they enter the portal. Layout + choices live in the shared AuthScreen organism;
// this container only supplies the content.
export default function SignInContainer() {
  return <AuthScreen {...SIGN_IN_CONTENT} />;
}
