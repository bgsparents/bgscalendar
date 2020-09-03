// import moment = require('moment');

interface DayData {
    uniform?: string;
    games?: string;
    kit?: string[];
}

interface DayDataMap { [key: string]: DayData; }

interface DateRange {
    start: moment.Moment;
    end: moment.Moment;
}

interface WeekRota {
    monday?: DayData;
    tuesday?: DayData;
    wednesday?: DayData;
    thursday?: DayData;
    friday?: DayData;
}

interface WeekRotaMap { [key: string]: WeekRota; }

interface ClassRotaMap { [key: string]: WeekRotaMap; }

interface Data {
    rota: ClassRotaMap;
    extras: DayDataMap;
    termTimes: DateRange[];
}


class Calendar {
    currentDate: moment.Moment = moment();
    data: Data;

    constructor(data: Data) {
        this.data = data;
        this.init();
    }

    render(when): void {
        this.currentDate = when.startOf('isoWeek');
        var today = moment();
        var tomorrow = moment(today).add(1, 'day');

        for (var i = 0; i < 7; ++i) {
            var date = moment(this.currentDate).add(i, 'days');
            $('.day-' + i + ' .date').text(date.format("MMM Do"));
            $('.day-' + i).data('date', date);
            $('.day-' + i).toggleClass('today', date.isSame(today, 'day'));
            $('.day-' + i).toggleClass('tomorrow', date.isSame(tomorrow, 'day'));
            $('.day-' + i).toggleClass('is-holiday', this.isHoliday(date));
        }
        this.pickClass(this.getPickedClass());
    }

    renderClassPick() {
        const parent = $('.class-pick');
        for(let key of Object.keys(this.data.rota)) {
            parent.append($('<li class="nav-item"></li>')
                .append($('<a class="nav-link" href="#"></a>')
                    .data('class', key)
                    .text(key)
                    .addClass('class-' + key)));
        }
    }

    getPickedClass(): string {
        try {
            var cls = localStorage.getItem("pick-class");
            return !cls ? $($('.class-pick a')[0]).data('class') : cls;
        } catch (e) {
            return $($('.class-pick a')[0]).data('class');
        }
    }

    pickClass(cls): void {
        $('.class-pick a').removeClass('active');
        $('.class-pick .class-' + cls).addClass('active');
        var epoch = moment('2020-08-31');
        var weeks = this.currentDate.diff(epoch, "week");

        var weekRota = this.data.rota[cls][weeks % 2 === 0 ? 'weekA' : 'weekB'];
        for (var key in weekRota) {
            var dayInfo = weekRota[key];
            if (dayInfo === undefined) {
                continue;
            }

            var date = $('.day.' + key).data('date');
            var extras = this.data.extras[date.format('YYYY-MM-DD')];
            var el = $('.day.' + key + ' .info').html('');
            var dl = $('<dl></dl>')
                .append($('<dt>Uniform</dt>')).append($('<dd></dd>').text(dayInfo.uniform));

            if (dayInfo.games) {
                dl.append($('<dt>Games</dt>')).append($('<dd></dd>').text(dayInfo.games));
            }

            var kitUl = $('<ul></ul>');
            dl.append($('<dt>Kit</dt>')).append($('<dd></dd>').append(kitUl));


            if (extras && extras.kit) {
                for (var i = 0; i < extras.kit.length; ++i) {
                    var item = '<span class="special">' + extras.kit[i] + '</span>';
                    kitUl.append($('<li></li>').html(item));
                }
            }

            for (var i = 0; i < dayInfo.kit.length; ++i) {
                var item = dayInfo.kit[i];
                if (item.startsWith('*')) {
                    item = '<span class="highlight">' + item.substring(1, item.length) + '</span>';
                }
                kitUl.append($('<li></li>').html(item));
            }

            el.append(dl);
        }

        try {
            localStorage.setItem("pick-class", cls);
        } catch (err) {

        }
    }

    scrollWeek(weeks: number): void {
        this.render(moment(this.currentDate).add(weeks, 'week'));
        this.scrollBest();
    }

    scrollBest(): void {
        if ($(window).width() < 768) {
            if ($('.day.today').length) {
                this.gotoToday();
            } else if ($('.day.tomorrow').length) {
                this.gotoTomorrow();
            } else {
                this.scrollTo('#calendar-container');
            }
        } else {
            this.scrollTo('#calendar-container');
        }
    }

    gotoToday(): void {
        this.scrollTo('.day.today');
    }

    gotoTomorrow(): void {
        this.scrollTo('.day.tomorrow');
    }

    scrollTo(selector: string): void {
        var tag = $(selector);
        if (tag.offset() !== undefined) {
            $('html,body').animate({scrollTop: tag.offset().top - $('.sticky-top').height()}, 'slow');
        }
    }

    isTermTime(date: moment.Moment): boolean {
        return this.data.termTimes.find(o => this.containsDate(o, date)) !== undefined;
    }

    isHoliday(date: moment.Moment): boolean {
        return !this.isTermTime(date);
    }

    containsDate(range: DateRange, date: moment.Moment): boolean {
        return date.isBetween(range.start, range.end, 'day', '[]');
    }


    init(): void {
        this.renderClassPick();

        $('.class-pick a').click(function (e) {
            e.preventDefault();
            this.pickClass($(e.target).data('class'));
        }.bind(this));

        $('.prev-week').click(function (e) {
            e.preventDefault();
            this.scrollWeek(-1);
        }.bind(this));

        $('.this-week').click(function (e) {
            e.preventDefault();
            this.render(moment());
            this.scrollBest();
        }.bind(this));

        $('.next-week').click(function (e) {
            e.preventDefault();
            this.scrollWeek(1);
        }.bind(this));

        $('.key .today').click(this.gotoToday.bind(this));
        $('.key .tomorrow').click(this.gotoTomorrow.bind(this));

        this.render(moment());

        if ($(window).width() < 768) {
            if ($('.day.today').length) {
                this.gotoToday();
            } else if ($('.day.tomorrow').length) {
                this.gotoTomorrow();
            }
        }
    }
}


