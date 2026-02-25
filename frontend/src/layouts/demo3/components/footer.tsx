import { Container } from '@/components/common/container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <Container>
        <div className="flex justify-center items-center py-5">
          <div className="flex gap-2 font-normal text-sm">
            <span className="text-muted-foreground">2012 - {currentYear} &copy;</span>
            <a
              href="https://twoclicks.com.br"
              target="_blank"
              className="text-secondary-foreground hover:text-primary"
            >
              TwoClicks Tecnologia
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
