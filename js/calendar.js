// import moment = require('moment');
var Calendar = /** @class */ (function () {
    function Calendar(data) {
        this.currentDate = moment();
        this.data = data;
        this.init();
    }
    Calendar.prototype.render = function (when) {
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
    };
    Calendar.prototype.renderClassPick = function () {
        var parent = $('.class-pick');
        for (var _i = 0, _a = Object.keys(this.data.rota); _i < _a.length; _i++) {
            var key = _a[_i];
            parent.append($('<li class="nav-item"></li>')
                .append($('<a class="nav-link" href="#"></a>')
                .data('class', key)
                .text(key)
                .addClass('class-' + key)));
        }
    };
    Calendar.prototype.getPickedClass = function () {
        try {
            var cls = localStorage.getItem("pick-class");
            return !cls ? $($('.class-pick a')[0]).data('class') : cls;
        }
        catch (e) {
            return $($('.class-pick a')[0]).data('class');
        }
    };
    Calendar.prototype.pickRota = function (cls) {
        var weekRota = this.data.rota[cls];
        for (var _i = 0, _a = Object.keys(weekRota); _i < _a.length; _i++) {
            var key = _a[_i];
            var rota = weekRota[key];
            if (this.isRotaForWeek(rota)) {
                return rota;
            }
        }
        return undefined;
    };
    Calendar.prototype.isRotaForWeek = function (rota) {
        var weeks = this.currentDate.diff(rota.start, "week");
        return weeks >= 0 && weeks % rota.frequency === 0;
    };
    Calendar.prototype.pickClass = function (cls) {
        $('.class-pick a').removeClass('active');
        $('.class-pick .class-' + cls).addClass('active');
        $('.day .info').html('');
        var weekRota = this.pickRota(cls);
        if (weekRota !== undefined) {
            for (var _i = 0, _a = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']; _i < _a.length; _i++) {
                var key = _a[_i];
                var dayInfo = weekRota[key];
                if (dayInfo === undefined) {
                    continue;
                }
                var date = $('.day.' + key).data('date');
                var extras = this.data.extras[date.format('YYYY-MM-DD')];
                var el = $('.day.' + key + ' .info');
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
        }
        try {
            localStorage.setItem("pick-class", cls);
        }
        catch (err) {
        }
    };
    Calendar.prototype.scrollWeek = function (weeks) {
        this.render(moment(this.currentDate).add(weeks, 'week'));
        this.scrollBest();
    };
    Calendar.prototype.scrollBest = function () {
        if ($(window).width() < 768) {
            if ($('.day.today').length) {
                this.gotoToday();
            }
            else if ($('.day.tomorrow').length) {
                this.gotoTomorrow();
            }
            else {
                this.scrollTo('#calendar-container');
            }
        }
        else {
            this.scrollTo('#calendar-container');
        }
    };
    Calendar.prototype.gotoToday = function () {
        this.scrollTo('.day.today');
    };
    Calendar.prototype.gotoTomorrow = function () {
        this.scrollTo('.day.tomorrow');
    };
    Calendar.prototype.scrollTo = function (selector) {
        var tag = $(selector);
        if (tag.offset() !== undefined) {
            $('html,body').animate({ scrollTop: tag.offset().top - $('.sticky-top').height() }, 'slow');
        }
    };
    Calendar.prototype.isTermTime = function (date) {
        var _this = this;
        return this.data.termTimes.find(function (o) { return _this.containsDate(o, date); }) !== undefined;
    };
    Calendar.prototype.isHoliday = function (date) {
        return !this.isTermTime(date);
    };
    Calendar.prototype.containsDate = function (range, date) {
        return date.isBetween(range.start, range.end, 'day', '[]');
    };
    Calendar.prototype.init = function () {
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
            }
            else if ($('.day.tomorrow').length) {
                this.gotoTomorrow();
            }
        }
    };
    return Calendar;
}());
//# sourceMappingURL=calendar.js.map