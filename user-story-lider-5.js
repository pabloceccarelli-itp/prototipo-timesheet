// HU - Líder 5: Revisar acumulado mensual del equipo en un proyecto
// Ejemplo:
// “Mostrame total de horas de Noviembre en proyecto Alfa.”

// Parsea consultas del líder tipo: "Mostrame total de horas de Noviembre en proyecto Alfa."
function parseLeaderMonthlyQuery(text) {
	const t = text.trim();

	// Meses en español (minúsculas)
	const monthMap = {
		enero: 1,
		febrero: 2,
		marzo: 3,
		abril: 4,
		mayo: 5,
		junio: 6,
		julio: 7,
		agosto: 8,
		septiembre: 9,
		setiembre: 9,
		octubre: 10,
		noviembre: 11,
		diciembre: 12
	};

	const regex =
		/m(ue|o)strame\s+total\s+de\s+horas\s+de\s+([a-záéíóúñ]+)(?:\s+de\s+(\d{4}))?\s+en\s+proyecto\s+(.+?)\.?$/i;
	const match = t.match(regex);
	if (!match) return null;

	const monthNameRaw = match[2].trim().toLowerCase();
	const yearRaw = match[3] ? parseInt(match[3], 10) : null;
	const proyecto = match[4].trim();

	const month = monthMap[monthNameRaw];
	if (!month || !proyecto) return null;

	const year = yearRaw && yearRaw > 1900 ? yearRaw : currentYear;

	return {
		month,
		monthName: monthNames[month - 1],
		year,
		proyecto
	};
}

// Filtra tareas de un proyecto para un mes específico
function filterTasksForProjectMonth(proyecto, year, month) {
	return tasksDatabase.filter((t) => {
		if (t.id_usuario === 0) return false; // Excluir feriados
		if (!t.horas || t.horas <= 0) return false;
		if (!t.proyecto || String(t.proyecto).toLowerCase() !== proyecto.toLowerCase()) return false;

		const taskDate = new Date(t.fecha_inicio + 'T00:00:00');
		return taskDate.getFullYear() === year && taskDate.getMonth() + 1 === month;
	});
}

// Crea mensaje para el chatbot con el resumen mensual
function buildMonthlySummaryMessage({ proyecto, monthName, year, tasks }) {
	const { byUser, total } = summarizeTeamTasksByUser(tasks);

	if (tasks.length === 0) {
		return `No se encontraron horas cargadas en el proyecto "${proyecto}" para ${monthName} ${year}.`;
	}

	// Ordenar usuarios por horas (mayor a menor)
	const sortedUsers = Object.entries(byUser)
		.sort((a, b) => b[1] - a[1])
		.map(([name, hours]) => `• ${name}: ${hours}h`);

	const header = `Resumen mensual de horas del equipo en proyecto "${proyecto}" (${monthName} ${year}):`;
	const totalLine = `Total del equipo: ${total}h`;
	const tasksLine = `${tasks.length} tarea${tasks.length !== 1 ? 's' : ''} registrada${tasks.length !== 1 ? 's' : ''}`;
	const footer = `¿Querés descargar el detalle en Excel (CSV)?`;

	return `${header}\n${sortedUsers.join('\n')}\n${totalLine}\n${tasksLine}\n\n${footer}`;
}

// Procesa la consulta del líder para obtener el acumulado mensual y responde en el chatbot
function processLeaderMonthlyCommand(text) {
	const parsed = parseLeaderMonthlyQuery(text);
	if (!parsed) return false;

	const tasks = filterTasksForProjectMonth(parsed.proyecto, parsed.year, parsed.month);
	const message = buildMonthlySummaryMessage({
		proyecto: parsed.proyecto,
		monthName: parsed.monthName,
		year: parsed.year,
		tasks
	});

	if (tasks.length === 0) {
		addMessage(message);
		return true;
	}

	showConfirmation(
		message,
		function () {
			const filename = `horas_mensuales_${parsed.proyecto.replace(/\s+/g, '_')}_${parsed.year}_${String(parsed.month).padStart(2, '0')}.csv`;
			downloadLeaderCSV(filename, tasks);
			addMessage('✅ Archivo CSV generado y descargado.');
		},
		function () {
			addMessage('De acuerdo. ¿Te ayudo con otra consulta?');
		}
	);

	return true;
}

