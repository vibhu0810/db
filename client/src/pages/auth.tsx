export default function AuthPage() {
  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="mt-6 text-2xl font-bold text-foreground">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in to your account
          </p>
          {/* Auth form will be added here */}
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 h-full w-full bg-muted" />
      </div>
    </div>
  );
}
