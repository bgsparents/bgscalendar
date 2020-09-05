// import moment = require('moment');
var CalendarModel = /** @class */ (function () {
    function CalendarModel(data, context) {
        this.currentDate = moment();
        this._data = data;
        this._context = context;
    }
    Object.defineProperty(CalendarModel.prototype, "classNames", {
        get: function () {
            return Object.keys(this._data.rota);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CalendarModel.prototype, "currentDate", {
        get: function () {
            return this._currentDate;
        },
        set: function (date) {
            this._currentDate = date.startOf('isoWeek');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CalendarModel.prototype, "classPickKey", {
        get: function () {
            return this._context ? 'pick-class-' + this._context : 'pick-class';
        },
        enumerable: true,
        configurable: true
    });
    CalendarModel.prototype.currentRota = function () {
        var weekRota = this._data.rota[this.currentClass];
        for (var _i = 0, _a = Object.keys(weekRota); _i < _a.length; _i++) {
            var key = _a[_i];
            var rota = weekRota[key];
            if (this.isRotaForWeek(rota)) {
                return rota;
            }
        }
        return undefined;
    };
    CalendarModel.prototype.extras = function (date) {
        return (this._data.extras && this._data.extras[date.format('YYYY-MM-DD')]) || {};
    };
    CalendarModel.prototype.overrides = function (date) {
        return (this._data.overrides && this._data.overrides[date.format('YYYY-MM-DD')]) || {};
    };
    CalendarModel.prototype.isTermTime = function (date) {
        return this._data.termTimes.find(function (o) { return CalendarModel.containsDate(o, date); }) !== undefined;
    };
    CalendarModel.prototype.isHoliday = function (date) {
        return !this.isTermTime(date);
    };
    CalendarModel.prototype.kit = function (date) {
        return this.arrayJoin(date, 'kit');
    };
    CalendarModel.prototype.uniform = function (date) {
        return this.arrayJoin(date, 'uniform');
    };
    CalendarModel.prototype.games = function (date) {
        return this.arrayJoin(date, 'games');
    };
    CalendarModel.prototype.arrayJoin = function (date, key) {
        var overrides = CalendarModel.value(this.overrides(date), key, [])
            .map(function (o) { return '*' + o; });
        var extra = CalendarModel.value(this.extras(date), key, [])
            .map(function (o) { return '+' + o; });
        var rota = CalendarModel.dayValue(this.currentRota(), date, key, []);
        return overrides.length ? overrides : extra.concat(rota);
    };
    // private stringJoin(date: moment.Moment, key: string) {
    //     const overrides: string = CalendarModel.value(this.overrides(date), key, '');
    //     const extra: string = CalendarModel.value(this.extras(date), key, null);
    //     const rota: string = CalendarModel.dayValue(this.currentRota(), date, key, null);
    //     return overrides && overrides.length
    //         ? '*' + CalendarModel.flat([overrides]).join(", ")
    //         : CalendarModel.flat([extra, rota].filter(o => o && o.length)).join(", ");
    // }
    CalendarModel.dayValue = function (info, date, key, def) {
        return info
            ? CalendarModel.value(info[date.format('dddd').toLowerCase()], key, [])
            : def;
    };
    CalendarModel.value = function (info, key, def) {
        return info && info[key] ? info[key] : def;
    };
    CalendarModel.flat = function (arr) {
        return arr.reduce(function (acc, val) { return acc.concat(val); }, []);
    };
    CalendarModel.prototype.recentOrFutureDeadlines = function () {
        var recent = this.deadlineForList(this._data.deadlines['global'])
            .concat(this.deadlineForList(this._data.deadlines[this.currentClass]));
        return recent.sort(function (l, r) {
            return l.date.diff(r.date, 'day');
        });
    };
    CalendarModel.prototype.deadlines = function (date) {
        return this.deadlineForDate(this._data.deadlines['global'], date)
            .concat(this.deadlineForDate(this._data.deadlines[this.currentClass], date))
            .map(function (o) { return '!' + o.title; });
    };
    CalendarModel.prototype.deadlineForList = function (deadlines) {
        if (deadlines === undefined) {
            return [];
        }
        var list = [];
        var today = moment().startOf('day');
        var after = moment(today).subtract(1, 'week');
        var _loop_1 = function (key) {
            var date = moment(key);
            if (date.isBefore(after)) {
                return "continue";
            }
            var values = deadlines[key];
            list = list.concat(values.map(function (t) {
                return {
                    date: date,
                    title: t,
                    expired: date.isBefore(today)
                };
            }));
        };
        for (var _i = 0, _a = Object.keys(deadlines); _i < _a.length; _i++) {
            var key = _a[_i];
            _loop_1(key);
        }
        return list;
    };
    CalendarModel.prototype.deadlineForDate = function (deadlines, date) {
        if (deadlines === undefined) {
            return [];
        }
        var values = deadlines[date.format('YYYY-MM-DD')];
        if (values === undefined) {
            return [];
        }
        return values.map(function (t) {
            return {
                date: date,
                title: t,
                expired: date.isBefore(moment())
            };
        });
    };
    CalendarModel.containsDate = function (range, date) {
        return date.isBetween(range.start, range.end, 'day', '[]');
    };
    CalendarModel.prototype.isRotaForWeek = function (rota) {
        var weeks = this.currentDate.diff(rota.start, "week");
        return weeks >= 0 && weeks % rota.frequency === 0;
    };
    return CalendarModel;
}());
var Calendar = /** @class */ (function () {
    function Calendar(data, context) {
        this.model = new CalendarModel(data, context);
        this.classPicker = $('.class-pick');
        this.init();
    }
    Object.defineProperty(Calendar.prototype, "pickedClass", {
        get: function () {
            try {
                var cls = localStorage.getItem(this.model.classPickKey);
                return !cls ? $($('.class-pick a')[0]).data('class') : cls;
            }
            catch (e) {
                return $($('.class-pick a')[0]).data('class');
            }
        },
        set: function (cls) {
            this.model.currentClass = cls;
            try {
                localStorage.setItem(this.model.classPickKey, cls);
            }
            catch (err) {
            }
            this.repaint();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Calendar.prototype, "currentDate", {
        set: function (date) {
            this.model.currentDate = date;
            this.repaint();
            Calendar.scrollBest();
        },
        enumerable: true,
        configurable: true
    });
    Calendar.prototype.paint = function () {
        this.paintClassPicker();
        this.model.currentClass = this.pickedClass;
        this.repaint();
    };
    Calendar.prototype.repaint = function () {
        this.repaintClassPicker();
        this.repaintHeaders();
        this.repaintCalendar();
        this.repaintDeadlines();
    };
    Calendar.prototype.repaintHeaders = function () {
        var today = moment();
        var tomorrow = moment(today).add(1, 'day');
        for (var i = 0; i < 7; ++i) {
            var date = moment(this.model.currentDate).add(i, 'days');
            $('.day-' + i)
                .data('date', date)
                .toggleClass('today', date.isSame(today, 'day'))
                .toggleClass('tomorrow', date.isSame(tomorrow, 'day'))
                .toggleClass('is-holiday', this.model.isHoliday(date))
                .find('.date').text(date.format("MMM Do"));
        }
    };
    Calendar.prototype.paintClassPicker = function () {
        for (var _i = 0, _a = this.model.classNames; _i < _a.length; _i++) {
            var key = _a[_i];
            this.classPicker.append($('<li class="nav-item"></li>')
                .append($('<a class="nav-link" href="#"></a>')
                .data('class', key)
                .text(key)
                .addClass('class-' + key)));
        }
    };
    Calendar.prototype.repaintClassPicker = function () {
        this.classPicker.find('a').removeClass('active');
        this.classPicker.find('.class-' + this.model.currentClass).addClass('active');
    };
    Calendar.prototype.repaintDeadlines = function () {
        var el = $('.deadlines .list').html('');
        var deadlines = this.model.recentOrFutureDeadlines();
        for (var i = 0; i < deadlines.length; ++i) {
            el.append($('<dt></dt>').text(deadlines[i].date.format('ddd, Do MMM')));
            el.append($('<dd></dd>').text(deadlines[i].title).toggleClass('expired', deadlines[i].expired));
        }
    };
    Calendar.prototype.repaintCalendar = function () {
        $('.day .info').html('');
        var weekRota = this.model.currentRota();
        if (weekRota !== undefined) {
            for (var _i = 0, _a = Calendar.weekdays(); _i < _a.length; _i++) {
                var key = _a[_i];
                var dayInfo = weekRota[key];
                if (dayInfo === undefined) {
                    continue;
                }
                this.repaintCalendarDay(key, dayInfo);
            }
        }
    };
    Calendar.prototype.repaintCalendarDay = function (day, info) {
        var date = $('.day.' + day).data('date');
        var dl = $('<dl></dl>');
        Calendar.createSectionList('Deadlines', this.model.deadlines(date), dl);
        Calendar.createSectionText('Uniform', this.model.uniform(date), dl);
        Calendar.createSectionText('Activities', this.model.games(date), dl);
        Calendar.createSectionList('Kit', this.model.kit(date), dl);
        if (info.timings && info.timings.length) {
            var dd = Calendar.createSection('Timings', dl);
            for (var i = 0; i < info.timings.length; ++i) {
                dd.append($('<div></div>')
                    .append($('<span></span>').text(info.timings[i].title))
                    .append($('<span class="float-right"></span>').text(info.timings[i].time)));
            }
        }
        $('.day.' + day + ' .info').append(dl);
    };
    Calendar.createSection = function (title, dl) {
        var dd = $('<dd></dd>');
        dl.append($('<dt></dt>').text(title))
            .append(dd);
        return dd;
    };
    Calendar.createSectionText = function (title, text, dl) {
        if (!text || text.length === 0 || text === '') {
            return null;
        }
        var markup = CalendarModel.flat([text]).map(function (o) { return Calendar.markup(o); }).join(', ');
        return Calendar.createSection(title, dl).html(markup);
    };
    Calendar.createSectionList = function (title, list, dl) {
        if (!list || list.length === 0) {
            return null;
        }
        var ul = $('<ul></ul>');
        for (var i = 0; i < list.length; ++i) {
            ul.append($('<li></li>').html(Calendar.markup(list[i])));
        }
        return Calendar.createSection(title, dl).append(ul);
    };
    Calendar.markup = function (value) {
        var css = 'normal';
        if (value.startsWith('*')) {
            css = 'highlight';
            value = value.substring(1, value.length);
        }
        else if (value.startsWith('+')) {
            css = 'special';
            value = value.substring(1, value.length);
        }
        else if (value.startsWith('!')) {
            css = 'warn';
            value = value.substring(1, value.length);
        }
        return $('<div></div>').append($('<span></span>').addClass(css).text(value)).html();
    };
    Calendar.weekdays = function () {
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    };
    Calendar.prototype.scrollWeek = function (weeks) {
        this.currentDate = moment(this.model.currentDate).add(weeks, 'week');
    };
    Calendar.isMobileView = function () {
        return $(window).width() < 768;
    };
    Calendar.scrollBest = function () {
        if (!Calendar.isMobileView() || !Calendar.gotoToTodayOrTomorrow()) {
            Calendar.gotoTop();
        }
    };
    Calendar.gotoTop = function () {
        Calendar.scrollTo('#calendar-container');
    };
    Calendar.gotoToday = function () {
        Calendar.scrollTo('.day.today');
    };
    Calendar.gotoTomorrow = function () {
        Calendar.scrollTo('.day.tomorrow');
    };
    Calendar.gotoToTodayOrTomorrow = function () {
        if ($('.day.today').length) {
            Calendar.gotoToday();
            return true;
        }
        else if ($('.day.tomorrow').length) {
            Calendar.gotoTomorrow();
            return true;
        }
        return false;
    };
    Calendar.scrollTo = function (selector) {
        var tag = $(selector);
        if (tag.offset() !== undefined) {
            $('html,body').animate({ scrollTop: tag.offset().top - $('.sticky-top').height() }, 'slow');
        }
    };
    Calendar.listener = function (fn) {
        return function (e) {
            e.preventDefault();
            fn(e);
        }.bind(this);
    };
    Calendar.prototype.listeners = function () {
        var _this = this;
        $('.class-pick a').click(Calendar.listener(function (e) { return _this.pickedClass = ($(e.target).data('class')); }));
        $('.prev-week').click(function () { return _this.scrollWeek(-1); });
        $('.this-week').click(function () { return _this.currentDate = moment(); });
        $('.next-week').click(function () { return _this.scrollWeek(1); });
        $('.key .today').click(function () { return Calendar.gotoToday(); });
        $('.key .tomorrow').click(function () { return Calendar.gotoTomorrow(); });
        $('.key .deadlines').click(function () { return Calendar.scrollTo('.col-12.deadlines'); });
    };
    Calendar.prototype.init = function () {
        this.paint();
        this.listeners();
        if (Calendar.isMobileView()) {
            Calendar.gotoToTodayOrTomorrow();
        }
    };
    return Calendar;
}());
//# sourceMappingURL=calendar.js.map