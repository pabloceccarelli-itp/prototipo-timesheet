// HU - Líder 4: Consultar historial de un colaborador en un proyecto
// Ejemplos:
// "Mostrame lo que cargó Ana en el proyecto Alfa en los últimos 3 meses"
// "Mostrame lo que cargó Juan en el proyecto Beta en los últimos 2 meses"
// "Mostrame lo que cargó María en el proyecto Gamma en los últimos 30 días"

// Parsea consultas del líder tipo: "Mostrame lo que cargó Ana en el proyecto Alfa en los últimos 3 meses"
// Acepta: "últimos X meses", "últimos X días"
function parseLeaderHistoryQuery(text) {
	const t = text.trim();

	// Patrones para diferentes períodos
	const patterns = [
		// "últimos X meses"
		/m(ue|o)strame\s+lo\s+que\s+carg[óo]\s+(.+?)\s+en\s+el\s+proyecto\s+(.+?)\s+en\s+los\s+últimos\s+(\d+)\s+meses\.?$/i,
		/m(ue|o)strame\s+lo\s+que\s+carg[óo]\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+en\s+los\s+últimos\s+(\d+)\s+meses\.?$/i,
		// "últimos X días"
		/m(ue|o)strame\s+lo\s+que\s+carg[óo]\s+(.+?)\s+en\s+el\s+proyecto\s+(.+?)\s+en\s+los\s+últimos\s+(\d+)\s+d[ií]as\.?$/i,
		/m(ue|o)strame\s+lo\s+que\s+carg[óo]\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+en\s+los\s+últimos\s+(\d+)\s+d[ií]as\.?$/i
	];

	let match = null;
	let periodoType = null;
	let cantidad = null;

	// Intentar cada patrón
	for (let i = 0; i < patterns.length; i++) {
		match = t.match(patterns[i]);
		if (match) {
			const nombre = match[2].trim();
			const proyecto = match[3].trim();
			cantidad = parseInt(match[4]);
			
			if (i < 2) {
				periodoType = 'meses';
			} else {
				periodoType = 'dias';
			}
			
			if (!nombre || !proyecto || !cantidad || cantidad <= 0) return null;
			
			return {
				nombre,
				proyecto,
				cantidad,
				periodoType
			};
		}
	}

	return null;
}

// Calcula el rango de fechas desde hoy hacia atrás según el período especificado
function calculateDateRangeFromPeriod(cantidad, periodoType) {
	const today = new Date();
	today.setHours(23, 59, 59, 999); // Fin del día de hoy
	const end = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
	
	const start = new Date(today);
	
	if (periodoType === 'meses') {
		// Restar X meses
		start.setMonth(today.getMonth() - cantidad);
		start.setDate(1); // Primer día del mes
		start.setHours(0, 0, 0, 0);
	} else if (periodoType === 'dias') {
		// Restar X días
		start.setDate(today.getDate() - cantidad);
		start.setHours(0, 0, 0, 0);
	}
	
	const startStr = formatDate(start.getFullYear(), start.getMonth() + 1, start.getDate());
	
	return { start: startStr, end };
}

// Resume tareas por mes para mostrar un desglose temporal
function summarizeTasksByMonth(tasks) {
	const byMonth = {};
	let total = 0;
	
	tasks.forEach((t) => {
		const date = new Date(t.fecha_inicio + 'T00:00:00');
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const monthName = monthNames[date.getMonth()] + ' ' + date.getFullYear();
		
		if (!byMonth[monthKey]) {
			byMonth[monthKey] = {
				monthName,
				hours: 0,
				tasks: 0
			};
		}
		byMonth[monthKey].hours += t.horas;
		byMonth[monthKey].tasks += 1;
		total += t.horas;
	});
	
	// Ordenar por mes (más reciente primero)
	const sortedMonths = Object.entries(byMonth)
		.sort((a, b) => b[0].localeCompare(a[0]))
		.map(([key, data]) => data);
	
	return { byMonth: sortedMonths, total };
}

// Crea mensaje para el chatbot con el resumen del historial
function buildHistorySummaryMessage({ nombre, proyecto, start, end, cantidad, periodoType, tasks }) {
	const rango = `${formatDateForDisplay(start)} al ${formatDateForDisplay(end)}`;
	
	// Formatear período
	const periodoDisplay = periodoType === 'meses' 
		? `últimos ${cantidad} mes${cantidad !== 1 ? 'es' : ''}`
		: `últimos ${cantidad} día${cantidad !== 1 ? 's' : ''}`;
	
	if (tasks.length === 0) {
		return `No se encontraron horas cargadas por ${nombre} en el proyecto "${proyecto}" en los ${periodoDisplay} (${rango}).`;
	}
	
	const { byMonth, total } = summarizeTasksByMonth(tasks);
	
	const header = `Historial de ${nombre} en proyecto "${proyecto}" (${periodoDisplay}, ${rango}):`;
	
	// Desglose por mes
	const monthLines = byMonth.map(m => {
		return `• ${m.monthName}: ${m.hours}h (${m.tasks} tarea${m.tasks !== 1 ? 's' : ''})`;
	});
	
	const totalLine = `Total: ${total}h en ${tasks.length} tarea${tasks.length !== 1 ? 's' : ''}`;
	
	// Sugerir descarga
	const footer = `¿Querés descargar el detalle en Excel (CSV)?`;
	
	return `${header}\n\n${monthLines.join('\n')}\n\n${totalLine}\n\n${footer}`;
}

// Procesa la consulta del líder para ver historial de colaborador y responde en el chatbot
function processLeaderHistoryCommand(text) {
	const parsed = parseLeaderHistoryQuery(text);
	if (!parsed) return false;
	
	// Calcular rango de fechas
	const { start, end } = calculateDateRangeFromPeriod(parsed.cantidad, parsed.periodoType);
	
	// Obtener IDs de usuario del nombre
	const nameToIds = buildUserNameToIdsMap();
	const key = parsed.nombre.toLowerCase();
	const userIds = nameToIds[key] || [];
	
	if (userIds.length === 0) {
		addMessage(`No se encontró al colaborador "${parsed.nombre}" en la base de datos.`);
		return true;
	}
	
	// Filtrar tareas por colaborador, proyecto y rango de fechas
	const filtered = filterTasksForLeader(parsed.proyecto, userIds, start, end);
	
	const message = buildHistorySummaryMessage({
		nombre: parsed.nombre,
		proyecto: parsed.proyecto,
		start,
		end,
		cantidad: parsed.cantidad,
		periodoType: parsed.periodoType,
		tasks: filtered
	});
	
	// Si no hay tareas, solo mostrar el mensaje sin opción de descarga
	if (filtered.length === 0) {
		addMessage(message);
		return true;
	}
	
	// Mostrar confirmación de descarga
	showConfirmation(
		message,
		function () {
			// Confirmó descargar
			const rangoNombre = `${start}_a_${end}`;
			const filename = `historial_${parsed.nombre.replace(/\s+/g, '_')}_${parsed.proyecto.replace(/\s+/g, '_')}_${rangoNombre}.csv`;
			downloadLeaderCSV(filename, filtered);
			addMessage('✅ Archivo CSV generado y descargado.');
		},
		function () {
			addMessage('De acuerdo. ¿Te ayudo con otra consulta?');
		}
	);
	
	return true;
}

