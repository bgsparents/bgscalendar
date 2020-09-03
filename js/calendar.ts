// import moment = require('moment');

interface StringMap {
    [key: string]: string;
}

interface Timing {
    title: string;
    time: string;
}

interface DayData {
    uniform?: string;
    games?: string;
    kit?: string[];
    timings?: Timing[];
}

interface DayDataMap {
    [key: string]: DayData;
}

interface DateRange {
    start: moment.Moment;
    end: moment.Moment;
}

interface WeekRota {
    start?: moment.Moment;
    frequency?: number;
    monday?: DayData;
    tuesday?: DayData;
    wednesday?: DayData;
    thursday?: DayData;
    friday?: DayData;
}

interface WeekRotaMap {
    [key: string]: WeekRota;
}

interface ClassRotaMap {
    [key: string]: WeekRotaMap;
}

interface Data {
    rota: ClassRotaMap;
    extras: DayDataMap;
    termTimes: DateRange[];
}

class CalendarModel {
    private _currentDate: moment.Moment;
    private _data: Data;
    private readonly _context: string;
    public currentClass: string;

    constructor(data: Data, context: string) {
        this.currentDate = moment();
        this._data = data;
        this._context = context;
    }

    get classNames(): Array<string> {
        return Object.keys(this._data.rota);
    }

    get currentDate(): moment.Moment {
        return this._currentDate;
    }

    set currentDate(date: moment.Moment) {
        this._currentDate = date.startOf('isoWeek');
    }

    get classPickKey(): string {
        return this._context ? 'pick-class-' + this._context : 'pick-class'
    }

    currentRota(): WeekRota {
        const weekRota = this._data.rota[this.currentClass];
        for (let key of Object.keys(weekRota)) {
            const rota = weekRota[key];
            if (this.isRotaForWeek(rota)) {
                return rota;
            }
        }
        return undefined;
    }

    extras(date: moment.Moment): DayData {
        return this._data.extras[date.format('YYYY-MM-DD')];
    }

    isTermTime(date: moment.Moment): boolean {
        return this._data.termTimes.find(o => CalendarModel.containsDate(o, date)) !== undefined;
    }

    isHoliday(date: moment.Moment): boolean {
        return !this.isTermTime(date);
    }

    private static containsDate(range: DateRange, date: moment.Moment): boolean {
        return date.isBetween(range.start, range.end, 'day', '[]');
    }

    private isRotaForWeek(rota: WeekRota): boolean {
        const weeks = this.currentDate.diff(rota.start, "week");
        return weeks >= 0 && weeks % rota.frequency === 0;
    }

}

class Calendar {
    model: CalendarModel;
    classPicker: JQuery<HTMLElement>;

    constructor(data: Data, context: string) {
        this.model = new CalendarModel(data, context);
        this.classPicker = $('.class-pick');
        this.init();
    }

    get pickedClass(): string {
        try {
            const cls = localStorage.getItem(this.model.classPickKey);
            return !cls ? $($('.class-pick a')[0]).data('class') : cls;
        } catch (e) {
            return $($('.class-pick a')[0]).data('class');
        }
    }

    set pickedClass(cls: string) {
        this.model.currentClass = cls;
        try {
            localStorage.setItem(this.model.classPickKey, cls);
        } catch (err) {
        }
        this.repaint();
    }

    set currentDate(date: moment.Moment) {
        this.model.currentDate = date;
        this.repaint();
        Calendar.scrollBest();
    }

    paint(): void {
        this.paintClassPicker();
        this.model.currentClass = this.pickedClass;
        this.repaint();
    }

    repaint(): void {
        this.repaintClassPicker();
        this.repaintHeaders();
        this.repaintCalendar();
    }

    private repaintHeaders() {
        const today = moment();
        const tomorrow = moment(today).add(1, 'day');
        for (let i = 0; i < 7; ++i) {
            const date = moment(this.model.currentDate).add(i, 'days');
            $('.day-' + i)
                .data('date', date)
                .toggleClass('today', date.isSame(today, 'day'))
                .toggleClass('tomorrow', date.isSame(tomorrow, 'day'))
                .toggleClass('is-holiday', this.model.isHoliday(date))
                .find('.date').text(date.format("MMM Do"));
        }
    }

    private paintClassPicker(): void {
        for (let key of this.model.classNames) {
            this.classPicker.append($('<li class="nav-item"></li>')
                .append($('<a class="nav-link" href="#"></a>')
                    .data('class', key)
                    .text(key)
                    .addClass('class-' + key)));
        }
    }

    private repaintClassPicker(): void {
        this.classPicker.find('a').removeClass('active');
        this.classPicker.find('.class-' + this.model.currentClass).addClass('active');
    }


    private repaintCalendar(): void {
        $('.day .info').html('');

        const weekRota = this.model.currentRota();
        if (weekRota !== undefined) {
            for (const key of Calendar.weekdays()) {
                const dayInfo = weekRota[key];
                if (dayInfo === undefined) {
                    continue;
                }
                this.repaintCalendarDay(key, dayInfo);
            }
        }
    }

    private repaintCalendarDay(day: string, info: DayData): void {
        const date = $('.day.' + day).data('date');
        const extras = this.model.extras(date);
        const el = $('.day.' + day + ' .info');
        const dl = $('<dl></dl>')
            .append($('<dt>Uniform</dt>')).append($('<dd></dd>').text(info.uniform));

        if (info.games) {
            dl.append($('<dt>Games</dt>')).append($('<dd></dd>').text(info.games));
        }

        const kitUl = $('<ul></ul>');
        dl.append($('<dt>Kit</dt>')).append($('<dd></dd>').append(kitUl));

        if (extras && extras.kit) {
            for (let i = 0; i < extras.kit.length; ++i) {
                const item = '<span class="special">' + extras.kit[i] + '</span>';
                kitUl.append($('<li></li>').html(item));
            }
        }

        for (let i = 0; i < info.kit.length; ++i) {
            let item = info.kit[i];
            if (item.startsWith('*')) {
                item = '<span class="highlight">' + item.substring(1, item.length) + '</span>';
            }
            kitUl.append($('<li></li>').html(item));
        }

        if (info.timings && info.timings.length) {
            const dd = $('<dd></dd>');
            dl.append($('<dt>Timings</dt>')).append(dd);

            for (let i = 0; i < info.timings.length; ++i) {
                dd.append($('<div></div>')
                    .append($('<span></span>').text(info.timings[i].title))
                    .append($('<span class="float-right"></span>').text(info.timings[i].time)));
            }
        }

        el.append(dl);
    }

    private static weekdays() {
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    }

    private scrollWeek(weeks: number): void {
        this.currentDate = moment(this.model.currentDate).add(weeks, 'week');
    }

    private static isMobileView(): boolean {
        return $(window).width() < 768;
    }

    private static scrollBest(): void {
        if (!Calendar.isMobileView() || !Calendar.gotoToTodayOrTomorrow()) {
            Calendar.gotoTop();
        }
    }

    private static gotoTop(): void {
        Calendar.scrollTo('#calendar-container');
    }

    private static gotoToday(): void {
        Calendar.scrollTo('.day.today');
    }

    private static gotoTomorrow(): void {
        Calendar.scrollTo('.day.tomorrow');
    }

    private static gotoToTodayOrTomorrow(): boolean {
        if ($('.day.today').length) {
            Calendar.gotoToday();
            return true;
        } else if ($('.day.tomorrow').length) {
            Calendar.gotoTomorrow();
            return true;
        }
        return false;
    }

    private static scrollTo(selector: string): void {
        const tag = $(selector);
        if (tag.offset() !== undefined) {
            $('html,body').animate({scrollTop: tag.offset().top - $('.sticky-top').height()}, 'slow');
        }
    }

    private static listener(fn: (e: Event) => void) {
        return function (e: Event) {
            e.preventDefault();
            fn(e);
        }.bind(this);
    }

    private listeners(): void {
        $('.class-pick a').click(Calendar.listener((e) => this.pickedClass = ($(e.target).data('class'))));
        $('.prev-week').click(() => this.scrollWeek(-1));
        $('.this-week').click(() => this.currentDate = moment());
        $('.next-week').click(() => this.scrollWeek(1));
        $('.key .today').click(() => Calendar.gotoToday());
        $('.key .tomorrow').click(() => Calendar.gotoTomorrow());
    }

    init(): void {
        this.paint();
        this.listeners();
        if (Calendar.isMobileView()) {
            Calendar.gotoToTodayOrTomorrow();
        }
    }
}
