'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export function DesignSystemPreview() {
    const { resolvedTheme, setTheme } = useTheme();
    const t = useTranslations('DesignSystem');
    const tCommon = useTranslations('Common');

    const isDark = resolvedTheme === 'dark';

    return (
        <main className="min-h-screen overflow-y-auto bg-background px-4 py-8 text-foreground sm:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-8">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
                        <p className="mt-2 text-muted-foreground">{t('description')}</p>
                    </div>
                    <Button variant="outline" size="icon" type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={tCommon('theme.label')}>
                        {isDark ? <Sun className="size-4" strokeWidth={2} /> : <Moon className="size-4" strokeWidth={2} />}
                    </Button>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader><CardTitle>{t('cardTitle')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">{t('cardContent')}</p>
                            <div className="flex flex-wrap gap-2">
                                <Badge>{t('brand')}</Badge>
                                <Badge variant="income">{t('income')}</Badge>
                                <Badge variant="expense">{t('expense')}</Badge>
                                <Badge variant="transfer">{t('transfer')}</Badge>
                            </div>
                            <Progress value={62} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>{tCommon('theme.label')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <Label htmlFor="design-system-input">{tCommon('actions.save')}</Label>
                            <Input id="design-system-input" placeholder={t('cardTitle')} />
                            <Separator />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-3/5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>{t('brand')}</CardTitle></CardHeader>
                        <CardContent>
                            <Dialog>
                                <DialogTrigger asChild><Button type="button">{t('openDialog')}</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{t('dialogTitle')}</DialogTitle>
                                        <DialogDescription>{t('dialogDescription')}</DialogDescription>
                                    </DialogHeader>
                                    <Button type="button">{tCommon('actions.save')}</Button>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    );
}
