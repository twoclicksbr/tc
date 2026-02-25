import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ReceberPage() {
  return (
    <Fragment>
      <Container>
        <h1 className="text-xl font-semibold mb-5">Receber</h1>
        <Card>
          <CardHeader>
            <CardTitle>Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Em desenvolvimento</p>
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
}
