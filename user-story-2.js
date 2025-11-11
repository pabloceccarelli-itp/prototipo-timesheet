
// Mapeo de nombres de días a números (0 = domingo, 1 = lunes, etc.)
const dayNameMap = {
    'lunes': 1, 'martes': 2, 'miércoles': 3, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sábado': 6, 'sabado': 6, 'domingo': 0,
    'lun': 1, 'mar': 2, 'mié': 3, 'mie': 3, 'jue': 4, 'vie': 5, 'sáb': 6, 'sab': 6, 'dom': 0
};

// Función para parsear rango de días (ej: "de lunes a viernes", "de martes a jueves")
function parseDayRange(text) {
    const lowerText = text.toLowerCase().trim();
    
    // Patrón: "de [día] a [día]"
    const pattern = /de\s+(\w+)\s+a\s+(\w+)/i;
    const match = lowerText.match(pattern);
    
    if (match) {
        const startDayName = match[1].toLowerCase();
        const endDayName = match[2].toLowerCase();
        
        const startDay = dayNameMap[startDayName];
        const endDay = dayNameMap[endDayName];
        
        if (startDay !== undefined && endDay !== undefined) {
            return { startDay, endDay, rangeText: match[0] };
        }
    }
    
    return null;
}

// Función para obtener fechas de un rango de días de la semana actual
function getDatesForDayRange(startDay, endDay) {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, etc.
    
    // Calcular el offset para llegar al lunes de esta semana
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    const dates = [];
    
    // Si el rango cruza el fin de semana (ej: viernes a lunes)
    if (startDay > endDay) {
        // Primera parte: desde startDay hasta domingo (6)
        for (let day = startDay; day <= 6; day++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + (day - 1));
            dates.push(formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
        }
        // Segunda parte: desde lunes (1) hasta endDay (sin incluir lunes si ya está en la primera parte)
        for (let day = 1; day <= endDay; day++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + (day - 1));
            dates.push(formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
        }
    } else {
        // Rango normal (ej: lunes a viernes, martes a jueves)
        for (let day = startDay; day <= endDay; day++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + (day - 1));
            dates.push(formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
        }
    }
    
    return dates;
}

// Función para parsear comando de carga en bloque
function parseBlockHoursCommand(text) {
    const lowerText = text.toLowerCase();
    
    // Patrón generalizado: "cargá/carga Xh/horas de [tarea] en proyecto [proyecto] de [día] a [día]"
    const patterns = [
        /carg[áa]\s+(\d+)\s*h\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+de\s+(\w+)\s+a\s+(\w+)/i,
        /carg[áa]\s+(\d+)\s*horas?\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+de\s+(\w+)\s+a\s+(\w+)/i,
        /carg[áa]\s+(\d+)\s*h\s+de\s+(.+?)\s+al\s+proyecto\s+(.+?)\s+de\s+(\w+)\s+a\s+(\w+)/i,
        /carg[áa]\s+(\d+)\s*horas?\s+de\s+(.+?)\s+al\s+proyecto\s+(.+?)\s+de\s+(\w+)\s+a\s+(\w+)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const horas = parseInt(match[1]);
            const tarea = match[2].trim();
            const proyecto = match[3].trim();
            const startDayName = match[4].toLowerCase();
            const endDayName = match[5].toLowerCase();
            
            const startDay = dayNameMap[startDayName];
            const endDay = dayNameMap[endDayName];
            
            if (startDay !== undefined && endDay !== undefined) {
                const fechas = getDatesForDayRange(startDay, endDay);
                
                return {
                    horas: horas,
                    tarea: tarea,
                    proyecto: proyecto,
                    fechas: fechas,
                    startDay: startDay,
                    endDay: endDay,
                    startDayName: startDayName,
                    endDayName: endDayName
                };
            }
        }
    }
    
    return null;
}
