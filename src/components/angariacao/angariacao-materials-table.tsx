'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Package } from 'lucide-react'
import type { AngariacaoMaterial } from '@/lib/angariacao/actions'

interface AngariacaoMaterialsTableProps {
  materials: AngariacaoMaterial[]
}

export function AngariacaoMaterialsTable({ materials }: AngariacaoMaterialsTableProps) {
  const formatPrice = (price: number) => `${price.toFixed(2)} €`

  const formatPriceWithVat = (price: number, vatRate: number) => {
    const priceWithVat = price * (1 + vatRate / 100)
    return `${priceWithVat.toFixed(2)} €`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Materiais de Canalizador</CardTitle>
        </div>
        <CardDescription>
          Lista de materiais e respectivos preços para serviços de canalização
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Preço s/ IVA</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Preço c/ IVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Nenhum material encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.material_name}</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(item.price_without_vat)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.vat_rate}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPriceWithVat(item.price_without_vat, item.vat_rate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
