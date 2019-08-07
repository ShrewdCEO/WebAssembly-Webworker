#include "worker.h"
#include <emscripten.h>
#include <emscripten/bind.h>

using namespace emscripten;

class Task {
public:
    Task()
        : _isRunning(false)
        , _isCanceled(false)
        , _cancellationCount(0)
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
                data : {
                    state : $1,
                    cancellationCount : $2
                }
            });
        },
            WorkerMessageType::NotifyState, state, _cancellationCount);
    }

    void Cancel()
    {
        if (!_isRunning) {
            return;
        }

        _isCanceled = true;
        ++_cancellationCount;
        NotifyState();
    }

    bool IsRunning() const
    {
        return _isRunning;
    }

    bool IsCanceled() const
    {
        return _isCanceled;
    }

    int CancellationCount() const
    {
        return _cancellationCount;
    }

protected:
    virtual void InternalRun() = 0;

private:
    bool _isRunning;
    bool _isCanceled;
    int _cancellationCount;
};
