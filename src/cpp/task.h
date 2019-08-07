#include "worker.h"
#include <emscripten.h>
#include <emscripten/bind.h>

using namespace emscripten;

class Task {
public:
    Task()
        : _isRunning(false)
        , _isCanceled(false)
    {
    }

    virtual ~Task() {}

    void Run()
    {
        _isRunning = true;
        _isCanceled = false;
        InternalRun();
        _isRunning = false;
    }

    virtual int State() const = 0;

    void NotifyState()
    {
        auto state = State();

        EM_ASM({
            postMessage({
                type : $0,
                data : $1
            });
        },
            WorkerMessageType::NotifyState, state);
    }

    void Cancel()
    {
        _isCanceled = true;
    }

    bool IsRunning() const
    {
        return _isRunning;
    }

    bool IsCanceled() const
    {
        return _isCanceled;
    }

protected:
    virtual void InternalRun() = 0;

private:
    bool _isRunning;
    bool _isCanceled;
};
