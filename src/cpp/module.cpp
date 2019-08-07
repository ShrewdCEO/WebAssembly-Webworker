#include <emscripten.h>
#include <emscripten/bind.h>

#include "task.h"

using namespace emscripten;

class CounterTask : public Task {
public:
    CounterTask()
        : _counter(0)
    {
    }

    int State() const override
    {
        return _counter;
    }

protected:
    void InternalRun() override
    {
        while (true) {
            if (IsCanceled()) {
                break;
            }

            ++_counter;
            NotifyState();

            emscripten_sleep_with_yield(1000);
        }
    }

private:
    int _counter;
};

EMSCRIPTEN_BINDINGS(Module)
{
    class_<Task>("Task")
        .function("run", &Task::Run)
        .function("cancel", &Task::Cancel)
        .property("state", &Task::State)
        .property("isCanceled", &Task::IsCanceled)
        .property("isRunning", &Task::IsRunning);

    class_<CounterTask, base<Task>>("CounterTask")
        .constructor();
}
