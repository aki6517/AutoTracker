import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DateNavigatorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return '今日';
  if (isYesterday) return '昨日';

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function DateNavigator({ currentDate, onDateChange }: DateNavigatorProps) {
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();
  const isFuture = currentDate > new Date();

  return (
    <div className="flex items-center gap-4">
      {/* ナビゲーションボタン */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 min-w-[200px] justify-center">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-lg font-medium text-white">{formatDate(currentDate)}</span>
        </div>

        <Button variant="ghost" size="icon" onClick={goToNextDay} disabled={isFuture}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* 今日ボタン */}
      {!isToday && (
        <Button variant="outline" size="sm" onClick={goToToday}>
          今日
        </Button>
      )}
    </div>
  );
}

