<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected $commands = [
        Commands\ScheduleCron::class
    ];
    protected function schedule(Schedule $schedule)
    {
        $schedule->command('schedule:cron')->everyFiveMinutes()->withoutOverlapping()->appendOutputTo(storage_path('logs/schedule.log'));
        $schedule->command('subscription:check')->daily()->withoutOverlapping()->appendOutputTo(storage_path('logs/schedule.log'));
        $schedule->command('start:blast')->everyMinute()->withoutOverlapping()->appendOutputTo(storage_path('logs/schedule.log'));
        //  $schedule->command('schedule:blast')->everyMinute();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__ . '/Commands');

        require base_path('routes/console.php');
    }
}
