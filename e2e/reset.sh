#!/bin/bash
su postgres -c "psql -h /tmp/pg -p 54329 -d sis_e2e -q -c 'truncate public.student_record_audit, public.student_enrollments, public.student_guardians, public.student_emergency_contacts, public.students, public.classes, public.staff_preferences cascade'"
curl -s -o /dev/null http://localhost:54321/__reset
