enum CwClueDirection {
    across = 'across',
    down = 'down',
}

interface CwClue {
    id: number;
    number: string;
    format: string;
    clue: string;
    firstCell?: CwCell;
    note?: any;
}

class CwCell {
    id: string;
    x: number;
    y: number;
    cw: CwCrossword;
    type: string;
    number: string;
    across?: number;
    down?: number;
    cell?: any;
    solution?: string;

    constructor(cw: CwCrossword, x: number, y: number) {
        this.cw = cw;
        this.x = x;
        this.y = y;
        this.type = 'block';
        this.id = x + '-' + y;
    }

    nextX(n: number) : CwCell {
        let cx = this.x - 1;
        for (let i = 1; i < this.cw.width; ++i) {
            let x = (cx + this.cw.width + (i * n)) % this.cw.width;
            let cell = this.cw.cell(x + 1, this.y);
            if (cell.type === 'letter') {
                return cell;
            }
        }
    }

    nextY(n: number) : CwCell {
        let cy = this.y - 1;
        for (let i = 1; i < this.cw.height; ++i) {
            let y = (cy + this.cw.height + (i * n)) % this.cw.height;
            let cell = this.cw.cell(this.x, y + 1);
            if (cell.type === 'letter') {
                return cell;
            }
        }
    }

    next(n: number, direction: CwClueDirection, haltAtClueBoundary: boolean) : CwCell {
        let currentId;
        if (direction === CwClueDirection.across) {
            let cell = this.nextX(n);
            if (cell.across === this.across && cell.x > (this.x * n)) {
                return cell;
            }
            currentId = cell.across;
        } else {
            let cell = this.nextY(n);
            if (cell.down === this.down && cell.y > (this.y * n)) {
                return cell;
            }
            currentId = cell.down;
        }

        if (!haltAtClueBoundary) {
            let next = (currentId - 1 + this.cw.clues.length + n) % this.cw.clues.length;
            return this.cw.clue(next + 1).firstCell;
        }

        return this;
    }
}

class CwCrossword {
    title: string;
    width: number;
    height: number;
    clues: Array<CwClue>;
    grid: Array<Array<CwCell>>;

    constructor(data: any) {
        let wordXml = data.find("word");
        this.title = $(data.find("metadata")).find("title").text();
        this.initClues(data.find("clue"), wordXml);
        this.initGrid(data.find("grid"), wordXml);
    }

    static loadXml(url: string, callback: (data: CwCrossword) => any, error?: (errorThrown : string) => void) : void {
        $.get(url, function (data) {
            callback(new CwCrossword($(data)));
        }).fail(function (jqXHR, textStatus, errorThrown) {
            if (error) {
                error(errorThrown);
            } else {
                alert("Failed to load crossword data");
                console.error("Failed to load crossword data - textStatus=" + textStatus + ", errorThrown=" + errorThrown);
            }
        });
    }

    static loadIndependentXml(code: String, callback: (data: CwCrossword) => any, error?: (errorThrown : string) => void) : void {
        this.loadXml(
            "https://ams.cdn.arkadiumhosted.com/assets/gamesfeed/independent/daily-crossword/" + code + ".xml",
            callback,
            error);
    }

    clue(id: number) {
        return this.clues[id - 1];
    }

    cell(x: number, y: number) : CwCell {
        return this.grid[x - 1][y - 1];
    }

    private initClues(cluesXml: any, wordXml: any) : void {
        this.clues = new Array(wordXml.length);
        cluesXml.each((i, node) => {
            let clueXml = $(node);
            let id = parseInt(clueXml.attr('word'));
            if (clueXml.attr('is-link')) {

            } else {
                this.clues[id - 1] = {
                    id: id,
                    number: clueXml.attr('number'),
                    format: clueXml.attr('format'),
                    clue: clueXml.text()
                }
            }
        });
    }

    private initGrid(gridXml: any, wordXml: any) : void {
        this.width = parseInt(gridXml.attr('width'));
        this.height = parseInt(gridXml.attr('height'));
        this.grid = new Array(this.width);

        for (let x = 0; x < this.width; ++x) {
            this.grid[x] = new Array(this.height);
            for (let y = 0; y < this.height; ++y) {
                this.grid[x][y] = new CwCell(this, x + 1, y + 1);
            }
        }

        gridXml.find('cell').each((i, node) => {
            let cellXml = $(node);
            let cell = this.cell(parseInt(cellXml.attr('x')), parseInt(cellXml.attr('y')));
            cell.number = cellXml.attr('number');
            cell.solution = cellXml.attr('solution');
        });

        wordXml.each((i, wordNode) => {
            let word = $(wordNode);
            let id = parseInt(word.attr('id'));
            this.wordToGrid(id, word, true);
            word.find('cells').each((i, link) => {
                this.wordToGrid(id, $(link), false);
            });
        });
    }

    private wordToGrid(id: number, word: any, firstClue: boolean) : void {
        let xl = word.attr('x').split('-').map(n => parseInt(n));
        let yl = word.attr('y').split('-').map(n => parseInt(n));
        let clue = this.clue(id);

        if (firstClue) {
            clue.firstCell = this.cell(xl[0], yl[0]);
        }

        if (xl.length > 1) {
            for (let x = xl[0]; x <= xl[1]; ++x) {
                this.cell(x, yl[0]).across = id;
                this.cell(x, yl[0]).type = 'letter';
            }
        } else {
            for (let y = yl[0]; y <= yl[1]; ++y) {
                this.cell(xl[0], y).down = id;
                this.cell(xl[0], y).type = 'letter';
            }
        }
    }
}

interface CwCurrent {
    id?: number;
    letter?: string;
    cell?: CwCell;
    direction?: CwClueDirection;
}

class CwBoardCell {
    
}

class CwBoard {
    crossword: CwCrossword;
    focused: CwCurrent;
    gridContainer: JQuery;
    gridTable: JQuery;
    answerListeners: Array<(CwCell, string) => void> = [];
    locationListeners: Array<(CwCell) => void> = [];
    noteListeners: Array<(number, any) => void> = [];

    constructor(crossword: CwCrossword) {
        this.crossword = crossword;
        this.focused = {};
        this.drawGrid();
        this.hookupKeyboard();
        this.hookupNotes();
        let firstCell = this.crossword.clue(1).firstCell;
        this.moveFocus(this.crossword.clue(1).firstCell);
    }

    static loadXml(url: string, callback: (board: CwBoard) => any) : void {
        CwCrossword.loadXml(url, (cw: CwCrossword) => {
            callback(new CwBoard(cw));
        });
    }

    static loadIndependentXml(code: String, callback: (board: CwBoard) => any) : void {
        this.loadXml("https://ams.cdn.arkadiumhosted.com/assets/gamesfeed/independent/daily-crossword/" + code + ".xml", callback);
    }

    private drawGrid() {
        let that = this;

        this.gridContainer = $('#grid_container').css({
            width: 'calc(2rem * ' + this.crossword.width + ' + ' + (this.crossword.width + 1) + ' * 2px)'
        });
        
        this.gridTable = $("#grid");

        for (let y = 1; y <= this.crossword.height; ++y) {
            let row = $('<tr>');
            for (let x = 1; x <= this.crossword.width; ++x) {
                let tableCell = $('<td>');
                let cell = this.crossword.cell(x, y);

                if (cell.type === 'block') {
                    tableCell.addClass('block');
                } else {
                    if (cell.number) {
                        tableCell.append($('<span>' + cell.number + '</span>').addClass('number'));
                    }
                    tableCell.append($('<div>').addClass('letter'));
                    if (cell.across) {
                        tableCell.addClass('c' + cell.across);
                    }
                    if (cell.down) {
                        tableCell.addClass('c' + cell.down);
                    }

                    cell.cell = tableCell;
                    tableCell.attr('id', cell.id);
                    tableCell.attr('tabindex', x + y * this.crossword.width);
                    tableCell.data('cell', cell);
                    tableCell.focus((e) => { that.letterFocus(e, cell) });
                    tableCell.click((e) => { that.letterFocus(e, cell) });
                    tableCell.keydown((e) => { that.keyDownListener(e, cell) });
                }
                row.append(tableCell);
            }
            this.gridTable.append(row);
        }
    }

    private backspace() {
        this.setFocused('');
        this.moveFocus(this.focused.cell.next(-1, this.focused.direction, true));
    }

    private delete() {
        this.setFocused('');
    }

    private letter(letter: string) {
        this.setFocused(letter.toUpperCase());
        this.moveFocus(this.focused.cell.next(1, this.focused.direction, false));
    }

    private setFocused(value: string) {
        $("#" + this.focused.cell.id + " .letter").text(value);
        this.fireAnswerListeners(this.focused.cell, value);
    }

    private fireAnswerListeners(cell: CwCell, answer: string) {
        this.answerListeners.forEach(l => { l(cell, answer); });
    }

    private fireLocationListeners(cell: CwCell) {
        this.locationListeners.forEach(l => { l(cell); });
    }

    private keyDownListener(e, cell: CwCell) {
        if (e.which === 37) {
            this.moveFocus(this.focused.cell.nextX(-1));
        } else if (e.which === 38) {
            this.moveFocus(this.focused.cell.nextY(-1));
        } else if (e.which === 39) {
            this.moveFocus(this.focused.cell.nextX(1));
        } else if (e.which === 40) {
            this.moveFocus(this.focused.cell.nextY(1));
        } else if (e.which === 8) {
            this.backspace();
        } else if (e.which === 46) {
            this.delete();
        } else if ((e.which > 64 && e.which < 91) || (e.which > 96 && e.which < 123)) {
            this.letter(String.fromCharCode(e.which));
        }
    }

    private hookupKeyboard() {
        $("#keyboard span").click((e) => {
            if (!this.focused) {
                return;
            }

            var key = $(e.target).text();
            if (key === 'BS') {
                this.backspace();
            } else if (key === 'DEL') {
                this.delete();
            } else {
                console.log(key)
                this.letter(key)
            }

            this.moveFocus(this.focused.cell);
        });
    }

    private hookupNotes() {
        $("#notes-input").blur((e) => {
            let note = $("#notes-input").val();
            this.crossword.clue(this.focused.id).note = note;
            this.fireNoteListeners(this.focused.id, note);
        });
    }

    private fireNoteListeners(clueId: number, note: any) {
        this.noteListeners.forEach(l => { l(clueId, note); });
    }

    private moveFocus(cell: CwCell) {
        cell.cell.focus();
    }

    private letterFocus(e, cell: CwCell) {
        let direction:CwClueDirection = this.focused.direction;
        if (e.type === 'click' && this.focused && cell.id === this.focused.letter) {
            if (this.focused.id === cell.across && cell.down) {
                direction = CwClueDirection.down;
            } else if (this.focused.id === cell.down && cell.across) {
                direction = CwClueDirection.across;
            }
        } else if (this.focused && (this.focused.id === cell.down || this.focused.id === cell.across)) {
            direction = this.focused.direction;
        } else if (cell.down) {
            direction = CwClueDirection.down;
        } else if (cell.across) {
            direction = CwClueDirection.across;
        }

        this.focus(cell, direction);
    }

    focus(cell: CwCell, direction: CwClueDirection) {
        this.focused.direction = direction;
        this.focused.id = direction == CwClueDirection.across ? cell.across : cell.down;
        this.focused.letter = cell.id;
        this.focused.cell = cell;

        let clue = this.crossword.clue(this.focused.id);
        $('.focus').removeClass('focus');
        $('#' + cell.id).addClass('focus');
        $('.highlight').removeClass('highlight');
        $('.c' + this.focused.id).addClass('highlight');
        $('#ic_number').text(clue.number);
        $('#ic_clue').text(clue.clue);
        $('#ic_format').text('(' + clue.format + ')');
        this.updateNote();
        this.fireLocationListeners(cell);
    }

    update(uuid: string, data: CwData) {
        for (let cellId in data.grid) {
            $('#' + cellId + ' .letter').text(data.grid[cellId].letter);
        }

        if (data.notes) {
            for (let clueId in data.notes) {
                let note = data.notes[clueId].note;
                let clue = this.crossword.clue(parseInt(clueId));
                clue.note = note;
                clue.firstCell.cell.toggleClass('has-note', note.trim() != '');
            }
        }

        if (data.solvers) {
            $('.watched').removeClass('watched');
            const keys = Object.keys(data.solvers);
            const now = new Date().getTime();
            for (const key of keys) {
                const solver = data.solvers[key];
                if (key != uuid && (now - solver.timestamp) < 120000) {
                    $('#' + solver.cellId).addClass('watched');
                }
            }
        }

        this.updateNote();
    }

    private updateNote() {
        let el = $("#notes-input");
        if(!el.get(0).matches(":focus")) {
            let note = this.crossword.clue(this.focused.id).note;
            el.val(note ? note : '');
        }
    }

    registerNoteListener(listener: (clueId: number, note: any) => void) {
        this.noteListeners.push(listener);
    }

    registerLocationListener(listener: (cell: CwCell) => void) {
        this.locationListeners.push(listener);
    }

    registerAnswerListener(listener: (cell: CwCell, answer: string) => void) {
        this.answerListeners.push(listener);
    }
}

interface CwDataCell {
    letter: string;
}

interface CwData {
    code?: string;
    url?: string;
    grid?: object;
    notes?: object;
    solvers?: object;
}

class CwStorage {
    id: string;
    data: CwData;
    refreshed: Date;

    constructor(id: string) {
        this.id = id;
        this.data = {};
    }

    age() {
        return Math.floor((new Date().getTime() - this.refreshed.getTime()) / 1000);
    }

    fetch(callback: (data : CwData) => void, error?: (errorThrown : string) => void) {
        $.get("https://extendsclass.com/api/json-storage/bin/" + this.id + "?cb=" + new Date().getTime(), (data) => {
            this.refreshed = new Date();
            this.data = JSON.parse(data);
            callback(this.data);
        }).fail(function (jqXHR, textStatus, errorThrown) {
            if (error) {
                error(errorThrown);
            } else {
                //alert("Failed to load storage");
                console.error("Failed to load storage - textStatus=" + textStatus + ", errorThrown=" + errorThrown);
            }
        });
    }

    pushLetter(key, value, callback: (data : CwData) => void) {
        let data = {
            grid: {}
        };

        data.grid[key] = {
            letter: value
        };

        this.push(data, callback);
    }

    pushNotes(key, value, callback: (data : CwData) => void) {
        let data = {
             notes: {}
        };

        data.notes[key] = {
            note: value
        };

        this.push(data, callback);
    }

    pushLocation(uuid, cellId, callback: (data : CwData) => void) {
        let data = {
            solvers: this.data.solvers
        };

        if (!data.solvers) {
            data.solvers = {};
        }

        if (!data.solvers[uuid]) {
            data.solvers[uuid] = {};
        }

        data.solvers[uuid].timestamp = new Date().getTime();
        data.solvers[uuid].cellId = cellId;

        this.push(data, callback);
    }

    push(data: object, callback: (data : CwData) => void) {
        $.ajax({
            type: "PATCH",
            url: "https://extendsclass.com/api/json-storage/bin/" + this.id,
            data: JSON.stringify(data),
            success: (response) => {
                this.refreshed = new Date();
                this.data = response;
                callback(response);
            },
            error: () => { alert("couldn't update db"); },
            contentType: "application/merge-patch+json",
            dataType: "json"
        });
    }

    static create(crossword: CwCrossword, code: string, callback: (id: string) => void) {
        let data: CwData = { code: code, grid: {}};

        $.ajax({
            type: "POST",
            url: "https://extendsclass.com/api/json-storage/bin",
            data: JSON.stringify(data),
            success: (response) => { callback(response.id); },
            error: () => { alert("Couldn't create db"); },
            contentType: "application/json",
            dataType: "json"
        });
    }
}

class CwApp {
    id: string;
    storage: CwStorage;
    board: CwBoard;
    uuid: string;

    constructor(id: string) {
        this.id = id;
        this.uuid = this.fetchUuid();
        $('body').addClass(this.hasId() ? 'has-id' : 'no-id');
    }

    start() {
        if (this.hasId()) {
            this.storage = new CwStorage(this.id);
            this.storage.fetch((data) => this.initBoard(data), this.showForm);
        } else {
            this.showForm();
        }
    }

    hasId() : boolean {
        return !!this.id;
    }

    private uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private fetchUuid() {
        let uuid;
        if (window.localStorage) {
            uuid = window.localStorage.getItem("cw-uuid");
        } else {
            uuid = this.getCookie("cw-uuid");
        }

        if (!uuid) {
            uuid = this.uuidv4();
            if (window.localStorage) {
                window.localStorage.setItem("cw-uuid", uuid);
            } else {
                this.setCookie("cw-uuid", uuid, 365);
            }
        }

        return uuid;
    }

    private getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for(var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    }

    private setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+ d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

    private initBoard(data: CwData) {
        $('body').addClass('has-id');
        CwBoard.loadIndependentXml(data.code, (board) => {
            this.board = board;
            this.board.update(this.uuid, data);
            this.board.registerAnswerListener(this.storageAnswerUpdate.bind(this));
            this.board.registerNoteListener(this.storageNoteUpdate.bind(this));
            this.board.registerLocationListener(this.storageLocationUpdate.bind(this));
            $("#title").text(this.board.crossword.title);
            window.setInterval(this.storageIntervalRefresh.bind(this), 2000);
            window.setInterval(this.ageRefresh.bind(this), 1000);
        });
    }

    private storageAnswerUpdate(cell: CwCell, answer: string) {
        this.storage.pushLetter(cell.id, answer, (data: CwData) => {
            this.board.update(this.uuid, data);
        });
    }

    private storageNoteUpdate(clueId: number, note: string) {
        this.storage.pushNotes(clueId, note, (data: CwData) => {
            this.board.update(this.uuid, data);
        });
    }

    private storageLocationUpdate(cell: CwCell) {
        this.storage.pushLocation(this.uuid, cell.id, (data: CwData) => {
            this.board.update(this.uuid, data);
        });
    }

    private ageRefresh() {
        $("#last-refresh").text("Refreshed " + this.storage.age() + "s ago");
    }

    private storageIntervalRefresh() {
        this.storage.fetch((data: CwData) => {
            this.board.update(this.uuid, data);
        });
    }

    private showForm() {
        $('body').addClass('no-id');
        $('#cw-button').click(() => {
            let code = $('#cw-code').val();
            if (code !== '') {
                this.setCode(code);
            }
        });

    }

    private setCode(code: any) {
        CwCrossword.loadIndependentXml(code, (cw: CwCrossword) => {
            CwStorage.create(cw, code, this.createSuccess);
        });
    }

    private createSuccess(id: string) {
        window.location.href += "#" + id;
        window.location.reload();
    }
}

let app:CwApp = new CwApp(window.location.hash ? window.location.hash.substr(1) : null);
app.start();
