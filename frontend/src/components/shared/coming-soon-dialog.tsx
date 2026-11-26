'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Wrench } from '@/components/ui/icons';

interface ComingSoonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ComingSoonDialog({ open, onOpenChange }: ComingSoonDialogProps) {
    const t = useTranslations('Common.comingSoon');
    const tActions = useTranslations('Common.actions');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                closeLabel={tActions('close')}
                className="max-w-[600px] gap-6 rounded-3xl p-6 sm:p-9"
            >
                <DialogBody className="space-y-5">
                    <div className="flex items-end justify-between gap-4 pt-1 pr-3">
                        <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl border border-solid border-primary/50 bg-gradient-to-br from-primary/30 via-primary/10 to-popover text-primary shadow-lg shadow-primary/15 sm:size-24">
                            <Wrench aria-hidden="true" className="size-12 sm:size-14" />
                        </div>
                        <span className="mb-2 inline-flex shrink-0 items-center gap-2 rounded-full border border-solid border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium sm:text-sm">
                            <span aria-hidden="true" className="size-3 rounded-full bg-primary shadow-sm shadow-primary/50" />
                            {t('badge')}
                        </span>
                    </div>
                    <DialogHeader className="space-y-2 text-left">
                        <DialogTitle className="m-0 text-2xl leading-tight font-bold sm:text-[30px]">
                            {t('title')}
                        </DialogTitle>
                        <DialogDescription className="m-0 text-base leading-relaxed">
                            {t('description')}
                        </DialogDescription>
                    </DialogHeader>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button className="h-12 w-full rounded-xl bg-gradient-to-r from-primary/85 to-primary text-base font-semibold shadow-md shadow-primary/15">
                            {t('confirm')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
