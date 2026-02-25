import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FinanceiroPage() {
  return (
    <Fragment>
      <Container>
        <h1 className="text-xl font-semibold mb-5">Financeiro</h1>
        <Card>
          <CardHeader>
            <CardTitle>Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Em desenvolvimento</p>
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
}
