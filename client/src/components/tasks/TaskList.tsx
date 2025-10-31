import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TaskItem } from "@/lib/types"
import { CheckSquare, Clock, AlertTriangle, Calendar } from "lucide-react"
import { format } from "date-fns"

interface TaskListProps {
  tasks: TaskItem[]
}

export function TaskList({ tasks }: TaskListProps) {
  const getTaskIcon = (taskType: string, status: string) => {
    if (status === 'overdue') {
      return <AlertTriangle className="h-5 w-5 text-red-600" />
    }
    
    switch (taskType) {
      case 'approval':
        return <CheckSquare className="h-5 w-5 text-blue-600" />
      case 'review':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <CheckSquare className="h-5 w-5 text-blue-600" />
    }
  }

  const getTaskBgColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-50 border-l-4 border-red-500'
      case 'pending':
        return 'bg-blue-50'
      case 'completed':
        return 'bg-green-50'
      default:
        return 'bg-gray-50'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTimeLeft = (dueDate: Date | string) => {
    const now = new Date()
    const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
    const diff = dueDateObj.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 0) {
      return `${Math.abs(hours)}h overdue`
    } else if (hours < 24) {
      return `Due in ${hours}h`
    } else {
      const days = Math.floor(hours / 24)
      return `Due in ${days}d`
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-6">
        <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">No tasks assigned</p>
      </div>
    )
  }

  // Show only the first 3 tasks in the dashboard
  const displayTasks = tasks.slice(0, 3)

  return (
    <div className="space-y-3">
      {displayTasks.map((task) => (
        <div
          key={task.id}
          className={`flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors ${getTaskBgColor(task.status)}`}
        >
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            {getTaskIcon(task.taskType, task.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {task.title}
              </p>
              {task.priority && (
                <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                  {task.priority}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {task.description}
            </p>
            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="h-3 w-3 mr-1" />
              <span>
                {task.dueDate ? getTimeLeft(task.dueDate) : 'No due date'}
              </span>
            </div>
          </div>
        </div>
      ))}
      
      {tasks.length > 3 && (
        <div className="pt-4 border-t">
          <Button variant="ghost" className="w-full text-sm text-primary hover:text-blue-700">
            View All Tasks ({tasks.length})
          </Button>
        </div>
      )}
    </div>
  )
}
