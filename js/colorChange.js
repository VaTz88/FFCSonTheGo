$(function () {
	addColorChangeEvents();

	// Disable clicking on timetable
	$("#toggleClickToSelect").click(function () {
		if ($(this).attr("data-state") === "enabled") {
			$(this).text("Enable On Click Selection");
			$(this).attr("data-state", "disabled");
			$('.quick-selection *[class*="-tile"]').off();
			$("#timetable .TimetableContent").off();
		} else {
			$(this).text("Disable On Click Selection");
			$(this).attr("data-state", "enabled");
			addColorChangeEvents();
		}
	});

	/**
	 * Code to generate a custom course list through #slot-sel-area, manage the
	 * list and to mark the added slots to the timetable.
	 */

	var totalCredits = 0;

	var CRM = (function () {
		function CourseRecord(slots, title, code, venue, fac, credits, $li) {
			this.slots = slots;
			this.title = title;
			this.code = code;
			this.venue = venue;
			this.fac = fac;
			this.credits = credits;
			this.$li = $li;
			this.isClashing = false;
		}

		function isSlotValid(slot) {
			var labSlotPattern = /^L\d{1,2}$/;
			var slotNum;

			if (!$("." + slot).length) {
				return false;
			}

			return true;
		}

		var CRM = {
			courses: [],
			add: function (slots, title, code, venue, fac, credits, $li) {
				slots = this.expandSlots(slots);
				var record = new CourseRecord(slots, title, code, venue, fac, credits, $li);
				var clashes = this.getClashingSlots(record);
				if (clashes.length()) {
					record.isClashing = true;
				}

				this.mark(record, clashes);
				this.courses.push(record);
			},

			getClashingSlots: function (newRecord) {
				var clashes = {
					arr: [],
					get: function (index) {
						return this.arr[index];
					},

					length: function () {
						return this.arr.length;
					},

					add: function (slot, rec1, rec2) {
						var isAdded = false;
						if (this.arr.length === 0) {
							this.arr.push({
								slot: slot,
								records: [rec1, rec2]
							});
							return;
						}

						this.arr.forEach(function (clash) {
							if (slot === clash.slot) {
								isAdded = true;
								if (clash.records.indexOf(rec1) === -1) {
									clash.records.push(rec1);
								}
								if (clash.records.indexOf(rec2) === -1) {
									clash.records.push(rec2);
								}
							}
						});

						if (!isAdded) {
							this.arr.push({
								slot: slot,
								records: [rec1, rec2]
							});
						}

					}
				};

				this.courses.forEach(function (otherRecord) {
					newRecord.slots.forEach(function (newSlot) {
						if (otherRecord.slots.indexOf(newSlot) >= 0) {
							clashes.add(newSlot, newRecord, otherRecord);
						}
					});
				});

				return clashes;
			},
			mark: function (record, clashes) {
				var i, loopSlot;

				record.slots.forEach(function (slot) {
					this.highlight(slot);
					this.appendCourseCode(slot, record.code, record.venue);
				}, this);

				if (record.isClashing) {
					for (i = 0; i < clashes.length(); ++i) {
						clashes.get(i).records.forEach(function (record) {
							record.$li.addClass("list-group-item-danger");
						});
						loopSlot = clashes.get(i).slot;
						this.highlight(loopSlot);
						this.clashSlot(loopSlot);
					}
				}
			},

			highlight: function (slot) {
				$("." + slot).addClass("highlight");
			},

			appendCourseCode: function (slot, code, venue) {
				var $slot = $("." + slot);

				if (!~$slot.text().indexOf(code)) {
					$slot.append('<span class="tt-course-code">' + code + ' - ' + venue + '</span>');
				}
			},

			clashSlot: function (slot) {
				$("." + slot).addClass("slot-clash");
			}
		};

		CRM.expandSlots = function (slots) {
			var i, length = slots.length;
			for (i = 0; i < length; ++i) {
				if (this.getSlotType(slots[i]) === "lab") continue;
				else {
					slots = slots.concat(this.convertToLab(slots[i]));
				}
			}
			return slots;
		};

		CRM.getSlotType = function (slot) {
			return /^L/.test(slot) ? "lab" : "theory";
		};

		CRM.convertToLab = function (slot) {
			var arr = [];
			$("." + slot).each(function () {
				arr.push($(this).text().replace(/^.*(L\d{1,2}).*$/, "$1"));
			});
			return arr;
		};

		CRM.listenForRemove = function () {
			var self = this;
			$("#slot-sel-area ul").on("click", "span.close", function () {
				var $li = $(this).parents().filter("li.list-group-item");
				var liDom = $li.get(0);
				var i;
				for (i = 0; i < self.courses.length; ++i) {
					if (self.courses[i].$li.get(0) === liDom) {
						self.courses.splice(i, 1);
						$(".TimetableContent").removeClass("highlight slot-clash");
						$(".TimetableContent").find(".tt-course-code").remove();
						$("#slot-sel-area .list-group li").removeClass("list-group-item-danger");
						break;
					}
				}

				var backupCourses = self.courses;
				self.courses = [];

				backupCourses.forEach(function (record) {
					var clashes = self.getClashingSlots(record);
					if (clashes.length()) {
						record.isClashing = true;
					}

					self.mark(record, clashes);
					self.courses.push(record);

				});

				totalCredits -= Number($li.find(".badge").text());

				totalSpan.text(totalCredits);

				$li.detach();

			});
		};

		CRM.listenForRemove();



		var facultyInput = $("#inputFaculty");
		var courseInput = $("#inputCourseTitle");
		var creditsInput = $("#inputCourseCredits");
		var courseCodeInput = $("#inputCourseCode");
		var venueInput = $("#inputVenue");
		var slotInput = $("#inputSlotString");
		var totalContainer = $("#slot-sel-area .list-group li.total");
		var totalSpan = totalContainer.find(".badge");

		function submitSlotData() {
			var slot, slotArray, i, normSlotString, li;
			slot = slotInput.val().trim();
			if (!slot) {
				$("#slot-sel-area .form-group").eq(0).addClass("has-error");
				return;
			}

			faculty = facultyInput.val().trim();
			course = courseInput.val().trim();
			courseCode = courseCodeInput.val().trim();
			venue = venueInput.val().trim();
			credits = Number(creditsInput.val());

			slotArray = slot.split(/\s*\+\s*/);

			normSlotString = slotArray.join(" + ");

			li = $('<li class="list-group-item">' +
				'<div class="row">' +
				'<div class="col-xs-3 col-sm-2 text-left">' + normSlotString + '</div>' +
				'<div class="col-xs-2 col-sm-1 text-center">' + courseCode + '</div>' +
				'<div class="hidden-xs col-sm-3 text-center">' + course + '</div>' +
				'<div class="col-xs-5 col-sm-3 text-center">' + faculty + '</div>' +
				'<div class="hidden-xs col-sm-1 text-center">' + venue + '</div>' +
				'<div class="hidden-xs col-sm-1 text-center">' +
				'<span class="badge">' + (credits ? credits : 0) + '</span>' +
				'</div>' +
				'<div class="col-xs-2 col-sm-1 text-right">' +
				'<span class="close">&times;</span>' +
				'</div>' +
				'</div>' +
				'</li>');

			totalContainer.before(li);

			totalCredits += credits;

			totalSpan.text(totalCredits);

			for (i = 0; i < slotArray.length; ++i) {
				slotArray[i] = slotArray[i].toUpperCase();
				if (!isSlotValid(slotArray[i])) {
					return false;
				}
			}

			courseCodeInput.val("");
			venueInput.val("");
			facultyInput.val("");
			courseInput.val("");
			slotInput.val("");
			creditsInput.val("");
			$('#insertSlotBtn').html('');

			CRM.add(slotArray, course, courseCode, venue, faculty, credits, li);
		}

		$("#slot-sel-area .panel-body #markBtn").click(submitSlotData);

		$("#resetButton").on("click", function resetTimeTable() {
			$('#insertSlotBtn').text('');
			$(".TimetableContent").removeClass("highlight slot-clash");
			$(".TimetableContent").find(".tt-course-code").remove();
			$('.quick-selection *[class*="-tile"]').removeClass("highlight");
			$("#slot-sel-area").find(".list-group-item").not(totalContainer).remove();

			totalCredits = 0;

			CRM.courses = [];

			totalSpan.text(0);
		});

		return CRM;
	})();

	/**
	 * Toggles slot highlighting of passed slot in the table.
	 * @param  {string} slot individual slot obtained from passed input.
	 * @return {undefined}
	 */
});

function addColorChangeEvents() {
	$("#timetable .TimetableContent:not([disabled])").click(function () {
		$(this).toggleClass("highlight");
		if (!$(this).hasClass("highlight")) {
			$(".quick-selection ." + this.classList[1] + "-tile").removeClass("highlight");
			return;
		}
		if ($("#timetable ." + this.classList[1]).not(".highlight").length === 0) {
			$(".quick-selection ." + this.classList[1] + "-tile").addClass("highlight");
		}
	});

	$('.quick-selection *[class*="-tile"]').click(function () {
		if ($(this).hasClass("highlight")) {
			$("#timetable ." + this.classList[0].split('-')[0]).removeClass("highlight");
		} else {
			$("#timetable ." + this.classList[0].split('-')[0]).addClass("highlight");
		}
		$(this).toggleClass("highlight");
	});
}