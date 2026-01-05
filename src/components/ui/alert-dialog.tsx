'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}

interface AlertDialogContentProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogContent({ children, className }: AlertDialogContentProps) {
  return (
    <div
      className={cn(
        'relative bg-background rounded-lg shadow-lg w-full max-w-md p-6',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

export function AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4', className)}
      {...props}
    />
  )
}

export function AlertDialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
}

export function AlertDialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

export function AlertDialogAction({ className, ...props }: AlertDialogActionProps) {
  return (
    <Button className={className} {...props} />
  )
}

export function AlertDialogCancel({ className, ...props }: AlertDialogActionProps) {
  return (
    <Button variant="outline" className={cn('mt-2 sm:mt-0', className)} {...props} />
  )
}
