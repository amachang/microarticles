import { UnreachableCaseError } from 'ts-essentials';
import api from '../api';
import { redirect, Form } from 'react-router-dom'

export async function loader(): Promise<Response | null> {
  const username = await api.auth.username();
  if (username === null) {
    return null;
  }
  else {
    return redirect(`/${username}`);
  }
}

export async function action({ request }: { request: Request }): Promise<Response> {
  const data = await request.formData();
  const username = data.get('username') as string;

  const info = await api.auth.start(username);
  switch (info.kind) {
    case 'registration': {
      const credential = await navigator.credentials.create(info.credentialOptions);
      if (credential === null) {
        throw new Error('Failed to create credential');
      }
      await api.auth.register(credential);
      break;
    }
    case 'authentication': {
      const credential = await navigator.credentials.get(info.credentialOptions);
      if (credential === null) {
        throw new Error('Failed to get credential');
      }
      await api.auth.login(credential);
      break;
    }
    default: {
      throw new UnreachableCaseError(info);
    }
  }
  return redirect(`/${username}`);
}

export default function Login(): JSX.Element {
  return (
      <Form method="post">
        <h1>Your URL</h1>
        <label>{location.hostname}/<input type="text" name="username" required minLength={1} maxLength={64} pattern="[\w\-]{1,64}" /></label>
        <button type="submit">Continue</button>
      </Form>
  );
}
