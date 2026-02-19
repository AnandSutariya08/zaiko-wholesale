import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { getNotes, getNotesByDate, saveNote, deleteNote, updateNoteStatus } from '@/lib/firebaseService';
import { Note } from '@/types';
import { Plus, Edit, Trash2, Calendar as CalendarIcon, Loader2, StickyNote, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/billUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [formData, setFormData] = useState({
    content: '',
  });

  useEffect(() => {
    loadNotes();
  }, [selectedDate]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const notesData = await getNotesByDate(dateStr);
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      toast.error('Please enter note content');
      return;
    }

    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const note: Note = {
        id: editingNote?.id || crypto.randomUUID(),
        date: dateStr,
        content: formData.content.trim(),
        isDone: editingNote?.isDone || false,
        createdAt: editingNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveNote(note);
      await loadNotes();

      setIsOpen(false);
      setEditingNote(null);
      resetForm();

      toast.success(editingNote ? 'Note updated successfully' : 'Note added successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      content: note.content,
    });
    setIsOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      await loadNotes();
      toast.success('Note deleted successfully');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleToggleDone = async (note: Note) => {
    try {
      await updateNoteStatus(note.id, !note.isDone);
      await loadNotes();
      toast.success(note.isDone ? 'Note marked as undone' : 'Note marked as done');
    } catch (error) {
      toast.error('Failed to update note status');
    }
  };

  const resetForm = () => {
    setFormData({
      content: '',
    });
  };

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const activeNotes = notes.filter(n => !n.isDone);
  const doneNotes = notes.filter(n => n.isDone);

  // Get dates with notes for calendar highlighting
  const [datesWithNotes, setDatesWithNotes] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const loadAllNotes = async () => {
      try {
        const allNotes = await getNotes();
        const dates = new Set(allNotes.map(n => n.date));
        setDatesWithNotes(dates);
      } catch (error) {
        console.error('Error loading all notes:', error);
      }
    };
    loadAllNotes();
  }, []);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="page-header-controls">
        <div className="page-header-title">
          <div className="page-header-icon">
            <StickyNote className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
          <h1 className="page-title">Notes</h1>
          <p className="page-subtitle">Manage your daily notes and reminders</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="page-header-btn" onClick={() => { setEditingNote(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>

          <DialogContent className="dialog-form-content sm:max-w-[500px]">
            <DialogHeader className="dialog-form-header">
              <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="dialog-form-body space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Note Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter your note..."
                  rows={5}
                  required
                />
              </div>

              <div className="dialog-form-footer flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingNote ? 'Update' : 'Add'} Note
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar and Notes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                }
              }}
              modifiers={{
                hasNotes: (date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return datesWithNotes.has(dateStr);
                }
              }}
              modifiersClassNames={{
                hasNotes: "bg-primary/20 text-primary font-semibold"
              }}
              className="rounded-md border"
            />
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Selected Date:</p>
              <p className="text-lg font-bold">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Notes List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Notes for {format(selectedDate, "MMMM d, yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner size="lg" text="Loading notes..." />
            ) : notes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <StickyNote className="h-16 w-16 mx-auto mb-4 opacity-40" />
                <p className="text-lg">No notes for this date</p>
                <p className="text-sm mt-2">Click "Add Note" to create your first note</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Notes */}
                {activeNotes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Circle className="h-4 w-4" />
                      Active Notes ({activeNotes.length})
                    </h3>
                    <div className="space-y-3">
                      {activeNotes.map((note) => (
                        <div
                          key={note.id}
                          className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <button
                            onClick={() => handleToggleDone(note)}
                            className="mt-1 flex-shrink-0"
                            aria-label="Mark as done"
                          >
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                              {note.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Created: {formatDate(note.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(note)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Note</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this note? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(note.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Done Notes */}
                {doneNotes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Completed Notes ({doneNotes.length})
                    </h3>
                    <div className="space-y-3">
                      {doneNotes.map((note) => (
                        <div
                          key={note.id}
                          className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30 opacity-75"
                        >
                          <button
                            onClick={() => handleToggleDone(note)}
                            className="mt-1 flex-shrink-0"
                            aria-label="Mark as undone"
                          >
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground line-through whitespace-pre-wrap break-words">
                              {note.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Created: {formatDate(note.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(note)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Note</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this note? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(note.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





