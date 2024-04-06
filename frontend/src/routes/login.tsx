import { redirect } from 'react-router-dom'

export async function loader(): Promise<Response | null> {
  const res = await fetch('/api/auth/username', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) {
    return res;
  }
  const username = await res.json();
  if (username === null) {
    return null;
  }
  else {
    return redirect(`/${username}`);
  }
}

export default function Login(): JSX.Element {

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = data.get('username') as string;
    console.log('username:', username);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Your URL</h1>
      <label>{location.hostname}/<input type="text" name="username" required minLength={1} maxLength={64} pattern="[\w\-]{1,64}" /></label>
      <button type="submit">Continue</button>
    </form>
  );
}
