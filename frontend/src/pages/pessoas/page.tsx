import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PessoasPage() {
  return (
    <Fragment>
      <Container>
        <h1 className="text-xl font-semibold mb-5">Pessoas</h1>
        <Card>
          <CardHeader>
            <CardTitle>Pessoas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Em desenvolvimento</p>
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
}
