
// Инициализация меню
const menu = document.querySelector('.aimmenu');
if (!menu) {
    console.error('Меню с классом .aimmenu не найдено');
} else {
    aimmenu(menu, {
        activate: activateSubmenu,
        deactivate: deactivateSubmenu,
        submenuDirection: 'right',
        exitMenu: () => true
    });
}

function aimmenu(menuElement, opts) {
    const options = Object.assign({
        rowSelector: '.has-sub',
        submenuSelector: '.is-sub',
        submenuDirection: 'right',
        tolerance: 75,
        enter: () => {},
        exit: () => {},
        activate: () => {},
        deactivate: () => {},
        exitMenu: () => {}
    }, opts);

    let activeRow = null;
    let mouseLocs = [];
    let lastDelayLoc = null;
    let timeoutId = null;
    const MOUSE_LOCS_TRACKED = 3;
    const DELAY = 300;

    // Закрыть меню при нажатии Escape
    function handleKeyDown(e) {
        if (e.key === 'Escape' && activeRow) {
            options.deactivate(activeRow);
            activeRow = null;
        }
    }

    function mousemoveDocument(e) {
        mouseLocs.push({ x: e.pageX, y: e.pageY });
        if (mouseLocs.length > MOUSE_LOCS_TRACKED) {
            mouseLocs.shift();
        }
    }

    function mouseleaveMenu() {
        if (timeoutId) clearTimeout(timeoutId);

        if (options.exitMenu(menuElement) && activeRow) {
            options.deactivate(activeRow);
            activeRow = null;
        }
    }

    function mouseenterRow(row) {
        if (timeoutId) clearTimeout(timeoutId);

        options.enter(row);
        possiblyActivate(row);
    }

    function mouseleaveRow(row) {
        options.exit(row);
    }

    function clickRow(row) {
        activate(row);
    }

    function activate(row) {
        if (row === activeRow) return;

        if (activeRow) {
            options.deactivate(activeRow);
        }

        options.activate(row);
        activeRow = row;
    }

    function possiblyActivate(row) {
        const delay = activationDelay();

        if (delay) {
            timeoutId = setTimeout(() => possiblyActivate(row), delay);
        } else {
            activate(row);
        }
    }

    function activationDelay() {
        if (!activeRow || !activeRow.querySelector(options.submenuSelector)) {
            return 0;
        }

        const rect = menuElement.getBoundingClientRect();
        const offset = {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY
        };
        const upperLeft = { x: offset.left, y: offset.top - options.tolerance };
        const upperRight = { x: offset.left + menuElement.offsetWidth, y: upperLeft.y };
        const lowerLeft = { x: offset.left, y: offset.top + menuElement.offsetHeight + options.tolerance };
        const lowerRight = { x: offset.left + menuElement.offsetWidth, y: lowerLeft.y };

        const loc = mouseLocs[mouseLocs.length - 1];
        let prevLoc = mouseLocs[0];

        if (!loc) return 0;
        if (!prevLoc) prevLoc = loc;

        if (
            prevLoc.x < offset.left ||
            prevLoc.x > lowerRight.x ||
            prevLoc.y < offset.top ||
            prevLoc.y > lowerRight.y
        ) {
            return 0;
        }

        if (lastDelayLoc && loc.x === lastDelayLoc.x && loc.y === lastDelayLoc.y) {
            return 0;
        }

        function slope(a, b) {
            return (b.y - a.y) / (b.x - a.x);
        }

        let decreasingCorner = upperRight;
        let increasingCorner = lowerRight;

        if (options.submenuDirection === 'left') {
            decreasingCorner = lowerLeft;
            increasingCorner = upperLeft;
        } else if (options.submenuDirection === 'below') {
            decreasingCorner = lowerRight;
            increasingCorner = lowerLeft;
        } else if (options.submenuDirection === 'above') {
            decreasingCorner = upperLeft;
            increasingCorner = upperRight;
        }

        const decreasingSlope = slope(loc, decreasingCorner);
        const increasingSlope = slope(loc, increasingCorner);
        const prevDecreasingSlope = slope(prevLoc, decreasingCorner);
        const prevIncreasingSlope = slope(prevLoc, increasingCorner);

        if (decreasingSlope < prevDecreasingSlope && increasingSlope > prevIncreasingSlope) {
            lastDelayLoc = loc;
            return DELAY;
        }

        lastDelayLoc = null;
        return 0;
    }

    // Инициализация слушателей
    menuElement.addEventListener('mouseleave', mouseleaveMenu);
    document.addEventListener('keydown', handleKeyDown); // Добавлено!

    const rows = menuElement.querySelectorAll(options.rowSelector);
    rows.forEach(row => {
        row.addEventListener('mouseenter', () => mouseenterRow(row));
        row.addEventListener('mouseleave', () => mouseleaveRow(row));
        row.addEventListener('click', () => clickRow(row));
    });

    document.addEventListener('mousemove', mousemoveDocument);
}

// Функция активации подменю (с минимальной высотой)
function activateSubmenu(row) {
    const submenu = row.querySelector('.is-sub');
    if (!submenu) return;

    const menu = document.querySelector('.aimmenu');
    const menuHeight = menu.offsetHeight; // Полная высота меню
    const menuWidth = menu.offsetWidth;

    // Получаем вычисленные стили (учитываем padding и border)
    const menuStyles = window.getComputedStyle(menu);
    const menuPaddingTop = parseFloat(menuStyles.paddingTop);
    const menuPaddingBottom = parseFloat(menuStyles.paddingBottom);
    const menuBorderTop = parseFloat(menuStyles.borderTopWidth);
    const menuBorderBottom = parseFloat(menuStyles.borderBottomWidth);

    // Вычисляем "внутреннюю" высоту (без padding и border)
    const innerMenuHeight = menuHeight - menuPaddingTop - menuPaddingBottom - menuBorderTop - menuBorderBottom;

    // Устанавливаем подменю минимальную высоту = высоте меню
    submenu.style.display = 'block';
    submenu.style.minHeight = `${innerMenuHeight}px`; // Ключевое изменение!
    submenu.style.top = '-1px';
    submenu.style.left = `${menuWidth - 3}px`;

    // Добавляем класс для подсветки
    const link = row.querySelector('a');
    if (link) link.classList.add('maintainHover');
}

function deactivateSubmenu(row) {
    const submenu = row.querySelector('.is-sub');
    if (submenu) submenu.style.display = 'none';

    const link = row.querySelector('a');
    if (link) link.classList.remove('maintainHover');
}

// Отмена всплытия кликов
document.querySelectorAll('.aimmenu .has-sub').forEach(li => {
    li.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});