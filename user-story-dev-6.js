// User Story 6: Duplicar entradas de esta semana para semanas restantes del mes

// Parseo: "Completá el mes restante con las horas del proyecto Delta de esta semana"
function parseFillRestOfMonthCommand(text) {
	const patterns = [
		/complet[áa]\s+el\s+mes\s+restante\s+con\s+las\s+horas\s+del\s+proyecto\s+(.+?)\s+de\s+esta\s+semana\.?$/i,
		/complet[áa]\s+el\s+mes\s+con\s+las\s+horas\s+del\s+proyecto\s+(.+?)\s+de\s+esta\s+semana\.?$/i
	];

	for (const pattern of patterns) {
		const m = text.match(pattern);
		if (m) {
			return { proyecto: m[1].trim() };
		}
	}
	return null;
}

function getMonthEndDate(year, month) {
	return new Date(year, month, 0); // último día del mes (month es 1..12)
}

function processFillRestOfMonthCommand(text) {
	const parsed = parseFillRestOfMonthCommand(text);
	if (!parsed) return false;

	const thisWeek = getThisWeekRange(); // 7 fechas (lunes..domingo)
	// Tomar como fuente solo entradas con horas > 0 del proyecto en esta semana
	const sourceTasks = tasksDatabase.filter(
		(t) =>
			t.id_usuario === 1 &&
			t.horas > 0 &&
			t.proyecto.toLowerCase() === parsed.proyecto.toLowerCase() &&
			thisWeek.includes(t.fecha_inicio)
	);

	if (sourceTasks.length === 0) {
		addMessage(
			`❌ No encontré horas en esta semana para el proyecto "${parsed.proyecto}".`
		);
		return true;
}

	// Determinar semanas futuras del mes actual a partir del próximo lunes
	const nextMonday = new Date(thisWeek[0] + 'T00:00:00');
	nextMonday.setDate(nextMonday.getDate() + 7);
	const monthEnd = getMonthEndDate(currentYear, currentMonth);

	// Preparar lista de lunes (semanas) hasta fin de mes
	const mondays = [];
	const iter = new Date(nextMonday);
	while (
		iter.getFullYear() === monthEnd.getFullYear() &&
		(iter.getMonth() === monthEnd.getMonth() || (iter.getMonth() === monthEnd.getMonth() - 0 && iter.getDate() <= monthEnd.getDate()))
	) {
		mondays.push(new Date(iter));
		iter.setDate(iter.getDate() + 7);
		// cortar si nos fuimos del mes
		if (iter > monthEnd) break;
	}

	if (mondays.length === 0) {
		addMessage('ℹ️ No quedan semanas completas en el mes para completar.');
		return true;
	}

	const confirmMessage = `¿Confirmás completar el mes con ${sourceTasks.length} entrada${sourceTasks.length > 1 ? 's' : ''} del proyecto "${parsed.proyecto}" replicadas en las semanas restantes del mes?`;

	showConfirmation(
		confirmMessage,
		function () {
			let createdOrUpdated = 0;
			// Para cada lunes futuro, generar sus 7 días y mapear por índice desde la semana fuente
			mondays.forEach((monday) => {
				for (let i = 0; i < 7; i++) {
					const target = new Date(monday);
					target.setDate(monday.getDate() + i);
					// Solo fechas dentro del mes actual
					if (target.getMonth() + 1 !== currentMonth || target.getFullYear() !== currentYear) continue;
					const targetStr = formatDate(target.getFullYear(), target.getMonth() + 1, target.getDate());

					// Para cada tarea fuente que caiga en el mismo índice i, replicarla
					sourceTasks.forEach((src) => {
						const srcIndex = thisWeek.indexOf(src.fecha_inicio);
						if (srcIndex === i) {
							// Verificar si es feriado
							if (hasHolidayOnDate(targetStr)) {
								return;
							}
							const existing = findExistingTask(src.proyecto, src.tarea, targetStr);
							if (existing) {
								// No sobreescribir si ya existe con horas > 0; mantener
								return;
							}
							const newTask = createTask(
								src.proyecto,
								src.tarea,
								targetStr,
								src.horas,
								src.detalle
							);
							tasksDatabase.push(newTask);
							createdOrUpdated++;
						}
					});
				}
			});

			// Re-renderizar (todas las fechas son del mes actual)
			renderCalendar(currentYear, currentMonth);

			setTimeout(() => {
				addMessage(
					`✅ Listo. Completé el mes con ${createdOrUpdated} entrada${createdOrUpdated === 1 ? '' : 's'} replicada${createdOrUpdated === 1 ? '' : 's'} del proyecto "${parsed.proyecto}".`
				);
			}, 500);
		},
		function () {
			addMessage('Operación cancelada. ¿Hay algo más en lo que pueda ayudarte?');
		}
	);

	return true;
}


